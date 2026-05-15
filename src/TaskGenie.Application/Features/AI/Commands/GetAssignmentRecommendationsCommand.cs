using System.Text;
using MediatR;
using TaskGenie.Application.Features.AI.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Application.Features.AI.Commands;

public sealed record GetAssignmentRecommendationsCommand(
    int TaskId,
    int ProjectId
) : IRequest<TaskAssignmentResponseDto>;

public sealed class GetAssignmentRecommendationsCommandHandler(
    ITaskRepository taskRepo,
    IUserRepository userRepo,
    ITaskRequiredSkillRepository skillRepo,
    IAiRecommendationRepository recommendationRepo,
    IHuggingFaceService huggingFaceService
) : IRequestHandler<GetAssignmentRecommendationsCommand, TaskAssignmentResponseDto>
{
    // Scoring weights
    private const double SkillMatchWeight = 0.40;
    private const double SemanticSimilarityWeight = 0.25;
    private const double WorkloadWeight = 0.20;
    private const double PerformanceWeight = 0.15;

    public async Task<TaskAssignmentResponseDto> Handle(GetAssignmentRecommendationsCommand cmd, CancellationToken ct)
    {
        // 1. Load task (with project nav for TeamId)
        var task = await taskRepo.GetByIdAsync(cmd.TaskId, ct)
            ?? throw new ArgumentException($"Task with ID {cmd.TaskId} not found");

        // 2. Load required skills
        var requiredSkills = await skillRepo.GetByTaskIdAsync(cmd.TaskId, ct);
        var taskSkillRequirements = requiredSkills.Select(rs => new TaskSkillRequirementDto
        {
            SkillId = rs.SkillId ?? 0,
            SkillName = rs.Skill?.SkillName ?? string.Empty,
            RequiredLevel = rs.RequiredLevel ?? 1
        }).ToList();

        // 3. Get team members via project's TeamId
        var projectFull = await taskRepo.GetByIdAsync(cmd.TaskId, ct); // has .Project nav
        var teamId = projectFull?.Project?.TeamId;

        List<User> teamMembers = teamId.HasValue
            ? await userRepo.GetByTeamIdAsync(teamId.Value, ct)
            : await userRepo.GetAllAsync(ct);

        if (teamMembers.Count == 0)
        {
            return new TaskAssignmentResponseDto
            {
                TaskId = cmd.TaskId,
                TaskTitle = task.Title,
                RequiredSkills = taskSkillRequirements
            };
        }

        // 4. Build user profiles
        var userProfiles = new List<UserSkillProfileInternal>();
        foreach (var member in teamMembers)
        {
            userProfiles.Add(await BuildUserProfileAsync(member, ct));
        }

        // 5. Compute semantic scores via HuggingFace
        var semanticScores = await ComputeSemanticScoresAsync(task, taskSkillRequirements, userProfiles, ct);

        // 6. Score all profiles
        var scoredProfiles = new List<ScoredProfile>();
        for (int i = 0; i < userProfiles.Count; i++)
        {
            var profile = userProfiles[i];
            var skillMatch = ComputeSkillMatchScore(profile, taskSkillRequirements);
            var workload = ComputeWorkloadScore(profile, task.EstimatedTime ?? 4);
            var performance = ComputePerformanceScore(profile);
            var semantic = i < semanticScores.Count ? semanticScores[i] : 0.5;
            var final = SkillMatchWeight * skillMatch
                      + SemanticSimilarityWeight * semantic
                      + WorkloadWeight * workload
                      + PerformanceWeight * performance;

            scoredProfiles.Add(new ScoredProfile(profile, skillMatch, semantic, workload, performance, final));
        }

        scoredProfiles = scoredProfiles.OrderByDescending(sp => sp.FinalScore).ToList();

        // 7. Build comparative reasons and suggestion list
        var suggestions = new List<AiSuggestionResultDto>();
        for (int rank = 0; rank < scoredProfiles.Count; rank++)
        {
            var sp = scoredProfiles[rank];
            var reason = BuildComparativeReason(task, sp, scoredProfiles, taskSkillRequirements, rank + 1);
            suggestions.Add(new AiSuggestionResultDto
            {
                UserId = sp.Profile.UserId,
                UserName = sp.Profile.UserName,
                Score = Math.Round(sp.FinalScore * 100, 2),
                Reason = reason,
                SkillMatchScore = Math.Round(sp.SkillMatchScore * 100, 2),
                SemanticSimilarityScore = Math.Round(sp.SemanticScore * 100, 2),
                WorkloadScore = Math.Round(sp.WorkloadScore * 100, 2),
                PerformanceScore = Math.Round(sp.PerformanceScore * 100, 2)
            });
        }

        // 8. Persist recommendations
        await recommendationRepo.DeleteByTaskIdAsync(cmd.TaskId, ct);
        var entities = suggestions.Select(s => AiRecommendation.Create(
            taskId: cmd.TaskId,
            suggestedUserId: s.UserId,
            score: s.Score,
            reason: s.Reason
        )).ToList();
        await recommendationRepo.AddRangeAsync(entities, ct);

        return new TaskAssignmentResponseDto
        {
            TaskId = cmd.TaskId,
            TaskTitle = task.Title,
            RequiredSkills = taskSkillRequirements,
            Suggestions = suggestions
        };
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private async Task<UserSkillProfileInternal> BuildUserProfileAsync(User user, CancellationToken ct)
    {
        var skills = await userRepo.GetUserSkillsAsync(user.UserId, ct);
        var availability = await userRepo.GetUserAvailabilityAsync(user.UserId, ct);
        var evaluations = await userRepo.GetUserEvaluationsAsync(user.UserId, ct);
        var activeTaskCount = await userRepo.CountActiveTasksByUserAsync(user.UserId, ct);

        EvaluationSummaryInternal? evalSummary = null;
        if (evaluations.Count > 0)
        {
            evalSummary = new EvaluationSummaryInternal(
                AvgSkillScore: evaluations.Average(e => e.SkillScore ?? 0),
                AvgTeamworkScore: evaluations.Average(e => e.TeamworkScore ?? 0),
                AvgCommunicationScore: evaluations.Average(e => e.CommunicationScore ?? 0),
                AvgDeadlineScore: evaluations.Average(e => e.DeadlineScore ?? 0)
            );
        }

        return new UserSkillProfileInternal(
            UserId: user.UserId,
            UserName: user.Name,
            ActiveTaskCount: activeTaskCount,
            TotalAvailableHours: availability.Sum(a => a.AvailableHours ?? 0),
            Skills: skills.Select(s => new SkillInfoInternal(
                SkillId: s.SkillId ?? 0,
                SkillName: s.Skill?.SkillName ?? string.Empty,
                Level: s.Level ?? 1
            )).ToList(),
            Evaluation: evalSummary
        );
    }

    private async Task<List<double>> ComputeSemanticScoresAsync(
        TaskEntity task,
        List<TaskSkillRequirementDto> requirements,
        List<UserSkillProfileInternal> profiles,
        CancellationToken ct)
    {
        try
        {
            var taskDescription = BuildTaskDescription(task, requirements);
            var userDescriptions = profiles.Select(BuildUserSkillDescription).ToList();
            return await huggingFaceService.ComputeSimilarityBatchAsync(taskDescription, userDescriptions);
        }
        catch
        {
            return profiles.Select(_ => 0.5).ToList();
        }
    }

    private static double ComputeSkillMatchScore(
        UserSkillProfileInternal profile,
        List<TaskSkillRequirementDto> requirements)
    {
        if (requirements.Count == 0) return 0.5;

        double totalScore = 0;
        foreach (var req in requirements)
        {
            var userSkill = profile.Skills.FirstOrDefault(s => s.SkillId == req.SkillId);
            if (userSkill is null)
                totalScore += 0;
            else
                totalScore += Math.Min((double)userSkill.Level / Math.Max(req.RequiredLevel, 1), 1.0);
        }
        return totalScore / requirements.Count;
    }

    private static double ComputeWorkloadScore(UserSkillProfileInternal profile, int estimatedHours)
    {
        if (profile.TotalAvailableHours == 0 && profile.ActiveTaskCount == 0) return 0.5;

        var taskPenalty = Math.Max(0.3, 1.0 - profile.ActiveTaskCount * 0.15);
        double availabilityBonus = profile.TotalAvailableHours > 0
            ? Math.Min(1.0, (double)profile.TotalAvailableHours / Math.Max(estimatedHours, 1))
            : 0.5;

        return taskPenalty * 0.6 + availabilityBonus * 0.4;
    }

    private static double ComputePerformanceScore(UserSkillProfileInternal profile)
    {
        if (profile.Evaluation is null) return 0.5;

        var avg = (profile.Evaluation.AvgSkillScore
                 + profile.Evaluation.AvgTeamworkScore
                 + profile.Evaluation.AvgCommunicationScore
                 + profile.Evaluation.AvgDeadlineScore) / 4.0;

        return Math.Min(avg / 10.0, 1.0);
    }

    private static string BuildTaskDescription(TaskEntity task, List<TaskSkillRequirementDto> requirements)
    {
        var sb = new StringBuilder();
        sb.Append($"Task: {task.Title ?? "Untitled"}. ");
        if (!string.IsNullOrEmpty(task.Description)) sb.Append($"Description: {task.Description}. ");
        if (!string.IsNullOrEmpty(task.Priority)) sb.Append($"Priority: {task.Priority}. ");
        if (task.Difficulty.HasValue) sb.Append($"Difficulty: {task.Difficulty}/10. ");
        if (requirements.Count > 0)
            sb.Append($"Required skills: {string.Join(", ", requirements.Select(r => $"{r.SkillName} (level {r.RequiredLevel})"))}.");
        return sb.ToString();
    }

    private static string BuildUserSkillDescription(UserSkillProfileInternal profile)
    {
        var sb = new StringBuilder();
        sb.Append($"Developer: {profile.UserName}. ");
        if (profile.Skills.Count > 0)
            sb.Append($"Skills: {string.Join(", ", profile.Skills.Select(s => $"{s.SkillName} (level {s.Level})"))}. ");
        if (profile.Evaluation is not null)
            sb.Append($"Performance: skill={profile.Evaluation.AvgSkillScore:F1}, teamwork={profile.Evaluation.AvgTeamworkScore:F1}. ");
        sb.Append($"Current workload: {profile.ActiveTaskCount} active tasks.");
        return sb.ToString();
    }

    private static string BuildComparativeReason(
        TaskEntity task,
        ScoredProfile current,
        List<ScoredProfile> all,
        List<TaskSkillRequirementDto> requirements,
        int rank)
    {
        var p = current.Profile;
        int totalMembers = all.Count;
        var sb = new StringBuilder();

        // --- Ranking ---
        sb.AppendLine($"Rank: #{rank}/{totalMembers} in the team");
        if (rank == 1)
            sb.AppendLine($"Best candidate for task \"{task.Title}\" with total score {Math.Round(current.FinalScore * 100, 1)}%");
        else
        {
            var best = all[0];
            var gap = Math.Round((best.FinalScore - current.FinalScore) * 100, 1);
            sb.AppendLine($"Lower than #{1} ({best.Profile.UserName}) by {gap} points");
        }

        // --- Skill Match ---
        var avgSkill = all.Average(x => x.SkillMatchScore);
        var bestSkill = all.Max(x => x.SkillMatchScore);
        var bestSkillUser = all.First(x => x.SkillMatchScore == bestSkill).Profile.UserName;
        sb.AppendLine();
        sb.AppendLine($"Skill Match: {Math.Round(current.SkillMatchScore * 100, 1)}% " +
                      $"(team avg: {Math.Round(avgSkill * 100, 1)}%, best: {Math.Round(bestSkill * 100, 1)}% - {bestSkillUser})");

        foreach (var req in requirements)
        {
            var userSkill = p.Skills.FirstOrDefault(s => s.SkillId == req.SkillId);
            int othersWithSkill = all.Count(x => x.Profile.Skills.Any(s => s.SkillId == req.SkillId));
            if (userSkill is not null)
            {
                var status = userSkill.Level >= req.RequiredLevel ? "[OK]" : "[LOW]";
                sb.AppendLine($"  {status} {req.SkillName}: Level {userSkill.Level}/{req.RequiredLevel} required. " +
                              $"{othersWithSkill}/{totalMembers} members have this skill");
            }
            else
            {
                sb.AppendLine($"  [MISSING] {req.SkillName}: Not found (requires level {req.RequiredLevel}). " +
                              $"{othersWithSkill}/{totalMembers} members have this skill");
            }
        }

        // --- Semantic Similarity ---
        var avgSemantic = all.Average(x => x.SemanticScore);
        var bestSemantic = all.Max(x => x.SemanticScore);
        var bestSemanticUser = all.First(x => x.SemanticScore == bestSemantic).Profile.UserName;
        sb.AppendLine();
        sb.AppendLine($"AI Semantic Match: {Math.Round(current.SemanticScore * 100, 1)}% " +
                      $"(team avg: {Math.Round(avgSemantic * 100, 1)}%, best: {Math.Round(bestSemantic * 100, 1)}% - {bestSemanticUser})");

        var semanticLabel = current.SemanticScore switch
        {
            >= 0.8 => "Profile is a VERY GOOD match for this task",
            >= 0.6 => "Profile is a GOOD match for this task",
            >= 0.4 => "Profile is an AVERAGE match for this task",
            _ => "Profile is a POOR match for this task"
        };
        sb.AppendLine($"  -> {semanticLabel}");

        // --- Workload ---
        var avgWorkload = all.Average(x => x.WorkloadScore);
        var bestWorkload = all.Max(x => x.WorkloadScore);
        var bestWorkloadUser = all.First(x => x.WorkloadScore == bestWorkload).Profile.UserName;
        sb.AppendLine();
        sb.AppendLine($"Workload: {Math.Round(current.WorkloadScore * 100, 1)}% " +
                      $"(team avg: {Math.Round(avgWorkload * 100, 1)}%, most available: {Math.Round(bestWorkload * 100, 1)}% - {bestWorkloadUser})");
        sb.AppendLine($"  -> {p.ActiveTaskCount} active tasks, {p.TotalAvailableHours}h available/week");

        var leastBusy = all.OrderBy(x => x.Profile.ActiveTaskCount).First();
        var mostBusy = all.OrderByDescending(x => x.Profile.ActiveTaskCount).First();
        if (p.UserId == leastBusy.Profile.UserId)
            sb.AppendLine("  Least busy in the team");
        else
            sb.AppendLine($"  Compared to: {leastBusy.Profile.UserName} ({leastBusy.Profile.ActiveTaskCount} tasks), " +
                          $"{mostBusy.Profile.UserName} ({mostBusy.Profile.ActiveTaskCount} tasks)");

        // --- Performance ---
        var avgPerf = all.Average(x => x.PerformanceScore);
        var bestPerf = all.Max(x => x.PerformanceScore);
        var bestPerfUser = all.First(x => x.PerformanceScore == bestPerf).Profile.UserName;
        sb.AppendLine();
        sb.AppendLine($"Performance: {Math.Round(current.PerformanceScore * 100, 1)}% " +
                      $"(team avg: {Math.Round(avgPerf * 100, 1)}%, best: {Math.Round(bestPerf * 100, 1)}% - {bestPerfUser})");

        if (p.Evaluation is not null)
        {
            var ev = p.Evaluation;
            sb.AppendLine($"  -> Skill: {ev.AvgSkillScore:F1}/10, Teamwork: {ev.AvgTeamworkScore:F1}/10, " +
                          $"Communication: {ev.AvgCommunicationScore:F1}/10, Deadline: {ev.AvgDeadlineScore:F1}/10");
        }
        else
        {
            sb.AppendLine("  -> No performance evaluations yet (default 50%)");
        }

        // --- Conclusion ---
        sb.AppendLine();
        var strengths = new List<string>();
        var weaknesses = new List<string>();
        if (current.SkillMatchScore >= avgSkill) strengths.Add("skill match"); else weaknesses.Add("skill match");
        if (current.SemanticScore >= avgSemantic) strengths.Add("AI semantic"); else weaknesses.Add("AI semantic");
        if (current.WorkloadScore >= avgWorkload) strengths.Add("workload availability"); else weaknesses.Add("workload");
        if (current.PerformanceScore >= avgPerf) strengths.Add("performance"); else weaknesses.Add("performance");

        sb.Append("Conclusion: ");
        if (strengths.Count > 0) sb.Append($"Outperforms team in: {string.Join(", ", strengths)}. ");
        if (weaknesses.Count > 0) sb.Append($"Below team average in: {string.Join(", ", weaknesses)}.");

        return sb.ToString();
    }

    // ── Internal value types ──────────────────────────────────────────────────

    private sealed record UserSkillProfileInternal(
        int UserId,
        string UserName,
        int ActiveTaskCount,
        int TotalAvailableHours,
        List<SkillInfoInternal> Skills,
        EvaluationSummaryInternal? Evaluation
    );

    private sealed record SkillInfoInternal(int SkillId, string SkillName, int Level);

    private sealed record EvaluationSummaryInternal(
        double AvgSkillScore,
        double AvgTeamworkScore,
        double AvgCommunicationScore,
        double AvgDeadlineScore
    );

    private sealed record ScoredProfile(
        UserSkillProfileInternal Profile,
        double SkillMatchScore,
        double SemanticScore,
        double WorkloadScore,
        double PerformanceScore,
        double FinalScore
    );
}
