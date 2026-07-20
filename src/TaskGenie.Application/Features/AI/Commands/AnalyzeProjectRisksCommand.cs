using MediatR;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.AI.Commands;

public sealed record ProjectRiskSummaryDto(
    int TotalActive,
    int CriticalRisk,
    int HighRisk,
    int MediumRisk,
    int LowRisk,
    double AverageScore,
    string Status,
    List<string> Warnings);

public sealed record AnalyzeProjectRisksCommand(int ProjectId) : IRequest<ProjectRiskSummaryDto>;

public sealed class AnalyzeProjectRisksCommandHandler(
    ITaskRepository taskRepo,
    IMediator mediator
) : IRequestHandler<AnalyzeProjectRisksCommand, ProjectRiskSummaryDto>
{
    public async Task<ProjectRiskSummaryDto> Handle(AnalyzeProjectRisksCommand cmd, CancellationToken ct)
    {
        var tasks = await taskRepo.GetByProjectIdAsync(cmd.ProjectId, ct);
        var activeTasks = tasks.Where(task => !string.Equals(task.Status, "Done", StringComparison.OrdinalIgnoreCase)).ToList();
        var assessments = new List<(string Title, TaskGenie.Application.Features.AI.DTOs.RiskAssessmentDto Result)>();

        foreach (var task in activeTasks)
        {
            var result = await mediator.Send(new AnalyzeTaskRiskCommand(task.TaskId), ct);
            if (result is not null) assessments.Add((task.Title ?? $"Task {task.TaskId}", result));
        }

        var critical = assessments.Count(item => item.Result.RiskLevel == "CRITICAL");
        var high = assessments.Count(item => item.Result.RiskLevel == "HIGH");
        var medium = assessments.Count(item => item.Result.RiskLevel == "MEDIUM");
        var low = assessments.Count(item => item.Result.RiskLevel == "LOW");
        var average = assessments.Count == 0 ? 0 : Math.Round(assessments.Average(item => item.Result.TotalScore), 2);
        var status = critical > 0 || high > 0 ? "DANGEROUS" : medium > activeTasks.Count / 2 ? "WARNING" : "SAFE";
        var warnings = assessments
            .Where(item => item.Result.RiskLevel is "CRITICAL" or "HIGH")
            .Select(item => $"{item.Title}: {item.Result.RiskLevel} ({item.Result.TotalScore:F2})")
            .ToList();

        return new ProjectRiskSummaryDto(activeTasks.Count, critical, high, medium, low, average, status, warnings);
    }
}
