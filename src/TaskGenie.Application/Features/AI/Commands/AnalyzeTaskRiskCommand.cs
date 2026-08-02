using System.Diagnostics;
using System.Text.Json;
using MediatR;
using TaskGenie.Application.Features.AI.DTOs;
using TaskGenie.Application.Features.AI.Services;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.AI.Commands;

public sealed record AnalyzeTaskRiskCommand(int TaskId) : IRequest<RiskAssessmentDto?>;

public sealed class AnalyzeTaskRiskCommandHandler(
    IResourceAuthorizationService authz,
    ITaskRepository taskRepo,
    ITaskLogRepository taskLogRepo,
    ITaskDependencyRepository dependencyRepo,
    IUserRepository userRepo,
    IProjectRepository projectRepo,
    ITeamMemberRepository teamMemberRepo,
    IRiskRepository riskRepo,
    RiskScoringEngine scoringEngine,
    ITextGenerationService textGenService,
    ICurrentUser currentUser,
    IMediator mediator
) : IRequestHandler<AnalyzeTaskRiskCommand, RiskAssessmentDto?>
{
    public async Task<RiskAssessmentDto?> Handle(AnalyzeTaskRiskCommand cmd, CancellationToken ct)
    {
        var task = await authz.EnsureCanManageTaskAsync(cmd.TaskId, ct);

        // The project decides what a working day is, so capacity is measured against its own shift
        // rather than a platform-wide assumption.
        var project = task.ProjectId is int projectId
            ? await projectRepo.GetByIdAsync(projectId, ct)
            : null;

        var stopwatch = Stopwatch.StartNew();
        var runId = Guid.NewGuid();
        var logs = await taskLogRepo.GetByTaskIdAsync(cmd.TaskId, ct);
        var latestLog = logs.OrderByDescending(log => log.CreatedAt).FirstOrDefault();
        var dependencies = await dependencyRepo.GetByTaskIdWithDetailsAsync(cmd.TaskId, ct);
        var incompleteDependencies = dependencies.Count(dependency =>
            !string.Equals(dependency.DependsOnTask?.Status, "Done", StringComparison.OrdinalIgnoreCase));
        var assignees = await taskRepo.GetTaskAssigneesAsync(cmd.TaskId, ct);

        var activeTaskCounts = new List<int>();
        var availableHours = new List<int>();
        var deadlineScores = new List<int>();
        foreach (var assignee in assignees.Where(assignee => assignee.UserId.HasValue))
        {
            var userId = assignee.UserId!.Value;
            activeTaskCounts.Add(await userRepo.CountActiveTasksByUserAsync(userId, ct));
            var availability = await userRepo.GetUserAvailabilityAsync(userId, ct);
            availableHours.Add(availability.Sum(item => item.AvailableHours ?? 0));
            var evaluations = await userRepo.GetUserEvaluationsAsync(userId, ct);
            deadlineScores.AddRange(evaluations.Where(item => item.DeadlineScore.HasValue).Select(item => item.DeadlineScore!.Value));
        }

        var input = new RiskScoringInput(
            Today: DateOnly.FromDateTime(DateTime.UtcNow),
            Status: task.Status,
            Progress: task.Progress ?? 0,
            Deadline: task.Deadline,
            CreatedAt: task.CreatedAt,
            EstimatedHours: task.EstimatedTime ?? task.AiEstimatedTime ?? 0,
            ActualHours: task.ActualTime ?? 0,
            TotalDependencies: dependencies.Count,
            IncompleteDependencies: incompleteDependencies,
            ReportedRisk: latestLog?.Risk,
            LatestProgressAt: latestLog?.CreatedAt,
            AverageActiveTaskCount: activeTaskCounts.Count == 0 ? -1 : activeTaskCounts.Average(),
            AverageAvailableHours: availableHours.Count == 0 ? 0 : availableHours.Average(),
            AverageDeadlineScore: deadlineScores.Count == 0 ? null : deadlineScores.Average(),
            Difficulty: task.Difficulty,
            Priority: task.Priority,
            WorkingHoursPerDay: project?.WorkingHoursPerDay);

        var configuredRules = (await riskRepo.GetActiveRulesAsync(ct))
            .Select(rule => new RiskRuleDefinition(rule.RiskRuleId, rule.Code, rule.Weight, rule.Version))
            .ToList();
        var result = scoringEngine.Calculate(input, configuredRules);

        var calculationMode = "RULES_ONLY";
        var explanation = result.Explanation;
        string? providerError = null;
        try
        {
            var prompt = "Explain this task risk assessment in no more than 80 words and do not change the score or level. " +
                         $"Task: {task.Title}. Score: {result.TotalScore}. Level: {result.RiskLevel}. " +
                         $"Factors: {string.Join(", ", result.Factors.Select(factor => $"{factor.Code}={factor.Score}"))}.";
            var generated = await textGenService.GenerateTextAsync(prompt, maxTokens: 120);
            if (string.IsNullOrWhiteSpace(generated) || generated.Contains("giả lập", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("AI provider returned an empty or simulated response.");
            explanation = $"{result.Explanation} AI explanation: {generated.Trim()}";
            calculationMode = "RULES_WITH_AI_EXPLANATION";
        }
        catch (Exception exception)
        {
            calculationMode = "RULES_ONLY_FALLBACK";
            providerError = exception.Message;
        }

        var history = RiskScoreHistory.Create(
            runId,
            task.TaskId,
            task.ProjectId,
            result.TotalScore,
            result.RiskLevel,
            result.RuleVersion,
            calculationMode,
            explanation,
            string.Join('\n', result.MitigationActions));

        foreach (var factor in result.Factors)
            history.AddFactor(RiskFactor.Create(
                factor.RuleId,
                factor.Code,
                factor.RawValue,
                factor.Score,
                factor.Weight,
                factor.Contribution,
                factor.Evidence));

        task.SetRiskAssessment(result.RiskLevel);
        await taskRepo.UpdateAsync(task, ct);

        stopwatch.Stop();
        var inputSnapshot = JsonSerializer.Serialize(input);
        var outputSnapshot = JsonSerializer.Serialize(new
        {
            result.TotalScore,
            result.RiskLevel,
            result.RuleVersion,
            Factors = result.Factors.Select(factor => new { factor.Code, factor.Score, factor.Contribution })
        });
        var executionLog = AiExecutionLog.Create(
            runId,
            task.TaskId,
            "TASK_RISK",
            calculationMode == "RULES_WITH_AI_EXPLANATION" ? "RULE_ENGINE+HUGGINGFACE" : "RULE_ENGINE",
            result.RuleVersion,
            inputSnapshot,
            outputSnapshot,
            calculationMode == "RULES_WITH_AI_EXPLANATION" ? "SUCCEEDED" : "FALLBACK",
            (int)stopwatch.ElapsedMilliseconds,
            providerError);

        await riskRepo.AddAssessmentAsync(history, executionLog, ct);

        await WarnAboutHighRiskAsync(task, result.RiskLevel, result.TotalScore, assignees, ct);

        return RiskAssessmentDto.FromEntity(history);
    }

    /// <summary>
    /// Raises a notification when the engine puts a task at HIGH or CRITICAL. It goes to the people
    /// doing the work and to whoever created the task; the caller who ran the estimate already sees
    /// the result on screen, so they are skipped.
    /// </summary>
    private async System.Threading.Tasks.Task WarnAboutHighRiskAsync(
        Domain.Entities.Task task,
        string riskLevel,
        double totalScore,
        IReadOnlyList<TaskAssignee> assignees,
        CancellationToken ct)
    {
        if (!string.Equals(riskLevel, "HIGH", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(riskLevel, "CRITICAL", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        // Whoever is doing the work hears about it first; the leaders hear about it either way.
        // When nobody is assigned there is no one else to tell, so it falls to the leaders alone.
        var recipients = assignees
            .Where(assignee => assignee.UserId.HasValue)
            .Select(assignee => assignee.UserId!.Value)
            .ToList();

        if (task.CreatedBy is int creator) recipients.Add(creator);

        var project = task.ProjectId is int pid ? await projectRepo.GetByIdAsync(pid, ct) : null;
        if (project?.TeamId is int teamId)
        {
            var members = await teamMemberRepo.GetByTeamIdAsync(teamId, ct);
            foreach (var leader in members.Where(m => m.Role == "LEADER" && m.UserId.HasValue))
                recipients.Add(leader.UserId!.Value);
        }

        var title = string.IsNullOrWhiteSpace(task.Title) ? $"Task #{task.TaskId}" : task.Title;
        var level = riskLevel.ToUpperInvariant();

        foreach (var userId in recipients.Distinct().Where(id => id != currentUser.UserId))
        {
            try
            {
                await mediator.Send(
                    new Notifications.Commands.CreateNotificationCommand(
                        userId,
                        "TASK_RISK",
                        $"Rủi ro {level}: {title}",
                        $"AI chấm mức rủi ro {level} ({Math.Round(totalScore)} điểm). Hãy xem lại công việc này.",
                        task.TaskId,
                        "TASK",
                        task.ProjectId),
                    ct);
            }
            catch
            {
                // A failed notification must never invalidate the assessment that was just stored.
            }
        }
    }
}
