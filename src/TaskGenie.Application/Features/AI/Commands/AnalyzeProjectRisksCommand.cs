using MediatR;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.AI.Commands;

public sealed record ProjectRiskSummaryDto(
    int TotalActive,
    int HighRisk,
    int MediumRisk,
    int LowRisk,
    string Status,
    List<string> Warnings
);

public sealed record AnalyzeProjectRisksCommand(int ProjectId) : IRequest<ProjectRiskSummaryDto>;

public sealed class AnalyzeProjectRisksCommandHandler(
    ITaskRepository taskRepo,
    IMediator mediator
) : IRequestHandler<AnalyzeProjectRisksCommand, ProjectRiskSummaryDto>
{
    public async Task<ProjectRiskSummaryDto> Handle(AnalyzeProjectRisksCommand cmd, CancellationToken ct)
    {
        var tasks = await taskRepo.GetByProjectIdAsync(cmd.ProjectId, ct);
        var activeTasks = tasks.Where(t => t.Status != "Done").ToList();

        int highRisk = 0, mediumRisk = 0, lowRisk = 0;
        var warnings = new List<string>();

        foreach (var task in activeTasks)
        {
            // Trigger individual risk analysis for each active task
            try
            {
                await mediator.Send(new AnalyzeTaskRiskCommand(task.TaskId), ct);
            }
            catch { /* ignore individual failures */ }

            // Count by existing RiskLevel
            if (task.RiskLevel == "HIGH")
            {
                highRisk++;
                warnings.Add($"Task '{task.Title}' is at HIGH risk.");
            }
            else if (task.RiskLevel == "MEDIUM") mediumRisk++;
            else lowRisk++;
        }

        string overallStatus = highRisk > 0
            ? "Dangerous"
            : mediumRisk > activeTasks.Count / 2
                ? "Warning"
                : "Safe";

        return new ProjectRiskSummaryDto(
            TotalActive: activeTasks.Count,
            HighRisk: highRisk,
            MediumRisk: mediumRisk,
            LowRisk: lowRisk,
            Status: overallStatus,
            Warnings: warnings
        );
    }
}
