using MediatR;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.AI.Commands;

public sealed record AnalyzeTaskRiskCommand(int TaskId) : IRequest<bool>;

public sealed class AnalyzeTaskRiskCommandHandler(
    ITaskRepository taskRepo,
    ITaskLogRepository taskLogRepo,
    IAiAnalysisRepository aiAnalysisRepo,
    IUserRepository userRepo,
    ITextGenerationService textGenService
) : IRequestHandler<AnalyzeTaskRiskCommand, bool>
{
    public async Task<bool> Handle(AnalyzeTaskRiskCommand cmd, CancellationToken ct)
    {
        var task = await taskRepo.GetByIdAsync(cmd.TaskId, ct);
        if (task is null) return false;

        var logs = await taskLogRepo.GetByTaskIdAsync(cmd.TaskId, ct);
        var latestLog = logs.OrderByDescending(l => l.CreatedAt).FirstOrDefault();

        // 1. Calculate Late Ratio from assignees' historical evaluations
        var assignees = await taskRepo.GetTaskAssigneesAsync(cmd.TaskId, ct);
        double totalLateRatio = 0;
        int validMembers = 0;

        foreach (var assignee in assignees)
        {
            if (!assignee.UserId.HasValue) continue;
            var evals = await userRepo.GetUserEvaluationsAsync(assignee.UserId.Value, ct);
            if (evals.Count > 0)
            {
                var avgScore = evals.Average(e => e.DeadlineScore ?? 5.0);
                // lateRatio = (10 - AvgScore) / 10 * 100%
                totalLateRatio += (10.0 - avgScore) / 10.0 * 100.0;
                validMembers++;
            }
        }

        double lateRatio = validMembers > 0 ? totalLateRatio / validMembers : 0;

        // 2. Base risk from late ratio
        string baseRiskLevel = lateRatio > 20 ? "HIGH" : lateRatio > 10 ? "MEDIUM" : "LOW";

        // 3. Time risk: EstimatedTime vs available working hours until deadline
        int estimatedHours = task.EstimatedTime ?? 0;
        int availableWorkingHours = 0;

        if (task.Deadline.HasValue)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            int remainingDays = task.Deadline.Value.DayNumber - today.DayNumber;
            availableWorkingHours = remainingDays > 0 ? remainingDays * 8 : 0;
        }

        bool isTimeRisk = estimatedHours > availableWorkingHours && estimatedHours > 0;
        string? reportedRisk = latestLog?.Risk;

        // 4. Build AI prompt
        var prompt = $"You are a Project Risk Analyst. Analyze the risk for task '{task.Title}' with current progress {task.Progress}%. " +
                     $"The team member's historical late-task ratio is {lateRatio:F1}%. " +
                     $"Estimated hours: {estimatedHours}. Available working hours until deadline: {availableWorkingHours}. ";

        if (isTimeRisk)
            prompt += "WARNING: Estimated hours exceed the available working hours! ";

        if (!string.IsNullOrWhiteSpace(reportedRisk))
            prompt += $"CRITICAL WARNING: The user just reported a specific risk: '{reportedRisk}'. ";

        prompt += "Based on this, what is the final Risk Level (LOW, MEDIUM, or HIGH) and why? ";

        string aiContent;
        try
        {
            aiContent = await textGenService.GenerateTextAsync(prompt, maxTokens: 100);
            if (string.IsNullOrWhiteSpace(aiContent) || aiContent.Contains("could not generate"))
                throw new Exception("AI returned empty or error message.");
        }
        catch
        {
            aiContent = $"Base risk is {baseRiskLevel} (Late ratio: {lateRatio:F1}%). ";
            if (isTimeRisk) aiContent += "Time is limited compared to estimated hours. ";
            if (!string.IsNullOrWhiteSpace(reportedRisk)) aiContent += $"User reported risk: {reportedRisk}. Risk escalated.";
        }

        var analysis = AiAnalysis.Create(cmd.TaskId, "risk", $"AI Risk Evaluation: {aiContent}");
        await aiAnalysisRepo.AddAsync(analysis, ct);

        return true;
    }
}
