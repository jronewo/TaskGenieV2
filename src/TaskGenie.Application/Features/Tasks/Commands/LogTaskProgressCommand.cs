using MediatR;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Tasks.Commands;

public sealed record LogTaskProgressCommand(
    int TaskId,
    int Progress,
    string? Note,
    string? Risk
) : IRequest<bool>;

public sealed class LogTaskProgressCommandHandler(
    IResourceAuthorizationService authz,
    ITaskRepository taskRepo,
    ITaskLogRepository taskLogRepo
) : IRequestHandler<LogTaskProgressCommand, bool>
{
    public async Task<bool> Handle(LogTaskProgressCommand cmd, CancellationToken ct)
    {
        var task = await authz.EnsureCanManageTaskAsync(cmd.TaskId, ct);

        // Determine risk level from deadline and progress
        string riskLevel = "LOW";
        if (task.Deadline.HasValue)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var daysUntilDeadline = task.Deadline.Value.DayNumber - today.DayNumber;

            if (daysUntilDeadline < 0 && cmd.Progress < 100)
                riskLevel = "HIGH";
            else if (daysUntilDeadline <= 2 && cmd.Progress < 80)
                riskLevel = "HIGH";
            else if (daysUntilDeadline <= 5 && cmd.Progress < 50)
                riskLevel = "MEDIUM";
        }

        // Escalate if user explicitly reported a risk
        if (!string.IsNullOrWhiteSpace(cmd.Risk))
        {
            if (riskLevel == "LOW") riskLevel = "MEDIUM";
            else if (riskLevel == "MEDIUM") riskLevel = "HIGH";
        }

        var log = TaskLog.Create(cmd.TaskId, cmd.Progress, cmd.Note, cmd.Risk);
        await taskLogRepo.AddAsync(log, ct);

        await taskRepo.UpdateProgressAsync(cmd.TaskId, cmd.Progress, riskLevel, ct);

        return true;
    }
}
