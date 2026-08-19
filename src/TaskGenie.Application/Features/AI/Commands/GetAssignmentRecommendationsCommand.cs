using System.Text;
using System.Diagnostics;
using System.Text.Json;
using MediatR;
using TaskGenie.Application.Features.AI.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Application.Features.AI.Services;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Application.Features.AI.Commands;

public sealed record GetAssignmentRecommendationsCommand(
    int TaskId,
    int ProjectId
) : IRequest<TaskAssignmentResponseDto>;

public sealed class GetAssignmentRecommendationsCommandHandler(
    IResourceAuthorizationService authz,
    IUserRepository userRepo,
    ITaskRequiredSkillRepository skillRepo,
    IAiRecommendationRepository recommendationRepo,
    IHuggingFaceService huggingFaceService,
    IRiskRepository riskRepository,
    AssignmentScoringEngine scoringEngine
) : IRequestHandler<GetAssignmentRecommendationsCommand, TaskAssignmentResponseDto>
{
    public async Task<TaskAssignmentResponseDto> Handle(GetAssignmentRecommendationsCommand cmd, CancellationToken ct)
    {
        var stopwatch = Stopwatch.StartNew();
        var runId = Guid.NewGuid();
        // 1. Load task (with project nav for TeamId), enforcing manage-level task access
        var task = await authz.EnsureCanManageTaskAsync(cmd.TaskId, ct);
        if (task.ProjectId != cmd.ProjectId)
            throw new InvalidOperationException("Task does not belong to the requested project.");

        // 2. Load required skills
        var requiredSkills = await skillRepo.GetByTaskIdAsync(cmd.TaskId, ct);
        var taskSkillRequirements = requiredSkills.Select(rs => new TaskSkillRequirementDto
        {
            SkillId = rs.SkillId ?? 0,
            SkillName = rs.Skill?.SkillName ?? string.Empty,
            RequiredLevel = rs.RequiredLevel ?? 1
        }).ToList();

        // 3. Get team members via project's TeamId
        var teamId = task.Project?.TeamId;

        List<User> teamMembers = teamId.HasValue
            ? await userRepo.GetByTeamIdAsync(teamId.Value, ct)
            : await userRepo.GetAllAsync(ct);

        if (teamMembers.Count == 0)
        {
            stopwatch.Stop();
            await riskRepository.AddExecutionLogAsync(AiExecutionLog.Create(
                runId,
                task.TaskId,
                "ASSIGNMENT_RECOMMENDATION",
                "RULE_ENGINE",
                AssignmentScoringEngine.ModelVersion,
                JsonSerializer.Serialize(new { cmd.TaskId, cmd.ProjectId, CandidateCount = 0 }),
                "[]",
                "NO_CANDIDATES",
                (int)stopwatch.ElapsedMilliseconds), ct);
            return new TaskAssignmentResponseDto
            {
                RunId = runId,
                TaskId = cmd.TaskId,
                TaskTitle = task.Title,
                RequiredSkills = taskSkillRequirements,
                ProviderStatus = "NO_CANDIDATES"
            };
        }

        // 4. Build user profiles
        var userProfiles = new List<UserSkillProfileInternal>();
        foreach (var member in teamMembers)
        {
            userProfiles.Add(await BuildUserProfileAsync(member, ct));
        }

        // 5. Compute semantic scores via HuggingFace
        var semanticResult = await ComputeSemanticScoresAsync(task, taskSkillRequirements, userProfiles, ct);
        var semanticScores = semanticResult.Scores;

        // 6. Score all profiles
        var scoredProfiles = new List<ScoredProfile>();
        for (int i = 0; i < userProfiles.Count; i++)
        {
            var profile = userProfiles[i];
            var skillMatch = ComputeSkillMatchScore(profile, taskSkillRequirements);
            var workload = ComputeWorkloadScore(profile, task.EstimatedTime ?? 4);
            var performance = ComputePerformanceScore(profile);
            var semantic = i < semanticScores.Count ? semanticScores[i] : 0.5;
            var score = scoringEngine.Calculate(new AssignmentScoreInput(skillMatch, semantic, workload, performance));

            scoredProfiles.Add(new ScoredProfile(profile, score.SkillMatch, score.SemanticSimilarity, score.Workload, score.Performance, score.Total));
        }

        scoredProfiles = scoredProfiles.OrderByDescending(sp => sp.FinalScore).ToList();

        // 7. Build comparative reasons and suggestion list
        var suggestions = new List<AiSuggestionResultDto>();
        for (int rank = 0; rank < Math.Min(3, scoredProfiles.Count); rank++)
        {
            var sp = scoredProfiles[rank];
            var reason = BuildComparativeReason(task, sp, scoredProfiles, taskSkillRequirements, rank + 1);
            suggestions.Add(new AiSuggestionResultDto
            {
                Rank = rank + 1,
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
        var entities = suggestions.Select(s => AiRecommendation.Create(
            taskId: cmd.TaskId,
            suggestedUserId: s.UserId,
            score: s.Score,
            reason: s.Reason,
            runId: runId,
            rank: s.Rank,
            skillMatchScore: s.SkillMatchScore,
            semanticSimilarityScore: s.SemanticSimilarityScore,
            workloadScore: s.WorkloadScore,
            performanceScore: s.PerformanceScore
        )).ToList();
        await recommendationRepo.AddRangeAsync(entities, ct);

        stopwatch.Stop();
        var executionLog = AiExecutionLog.Create(
            runId,
            task.TaskId,
            "ASSIGNMENT_RECOMMENDATION",
            semanticResult.UsedFallback ? "RULE_ENGINE_WITH_SEMANTIC_FALLBACK" : "RULE_ENGINE+HUGGINGFACE",
            AssignmentScoringEngine.ModelVersion,
            JsonSerializer.Serialize(new
            {
                cmd.TaskId,
                cmd.ProjectId,
                RequiredSkills = taskSkillRequirements,
                CandidateCount = userProfiles.Count
            }),
            JsonSerializer.Serialize(suggestions.Select(suggestion => new
            {
                suggestion.Rank,
                suggestion.UserId,
                suggestion.Score,
                suggestion.SkillMatchScore,
                suggestion.SemanticSimilarityScore,
                suggestion.WorkloadScore,
                suggestion.PerformanceScore
            })),
            semanticResult.UsedFallback ? "FALLBACK" : "SUCCEEDED",
            (int)stopwatch.ElapsedMilliseconds,
            semanticResult.Error);
        await riskRepository.AddExecutionLogAsync(executionLog, ct);

        return new TaskAssignmentResponseDto
        {
            RunId = runId,
            TaskId = cmd.TaskId,
            TaskTitle = task.Title,
            RequiredSkills = taskSkillRequirements,
            Suggestions = suggestions,
            ModelVersion = AssignmentScoringEngine.ModelVersion,
            ProviderStatus = semanticResult.UsedFallback ? "SEMANTIC_FALLBACK" : "SUCCEEDED"
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

    private async Task<SemanticScoreResult> ComputeSemanticScoresAsync(
        TaskEntity task,
        List<TaskSkillRequirementDto> requirements,
        List<UserSkillProfileInternal> profiles,
        CancellationToken ct)
    {
        try
        {
            var taskDescription = BuildTaskDescription(task, requirements);
            var userDescriptions = profiles.Select(BuildUserSkillDescription).ToList();
            var scores = await huggingFaceService.ComputeSimilarityBatchAsync(taskDescription, userDescriptions);
            if (scores.Count != profiles.Count)
                throw new InvalidOperationException("Semantic provider returned an unexpected number of scores.");
            return new SemanticScoreResult(scores, false, null);
        }
        catch (Exception exception)
        {
            return new SemanticScoreResult(profiles.Select(_ => 0.5).ToList(), true, exception.Message);
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

    private sealed record SemanticScoreResult(List<double> Scores, bool UsedFallback, string? Error);
}
