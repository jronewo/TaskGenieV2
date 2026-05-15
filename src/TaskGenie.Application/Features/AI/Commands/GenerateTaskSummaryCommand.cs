using MediatR;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.AI.Commands;

public sealed record GenerateTaskSummaryCommand(int TaskId) : IRequest<bool>;

public sealed class GenerateTaskSummaryCommandHandler(
    ITaskRepository taskRepo,
    IAiAnalysisRepository aiAnalysisRepo
) : IRequestHandler<GenerateTaskSummaryCommand, bool>
{
    public async Task<bool> Handle(GenerateTaskSummaryCommand cmd, CancellationToken ct)
    {
        var task = await taskRepo.GetByIdAsync(cmd.TaskId, ct);
        if (task is null) return false;

        var assignees = await taskRepo.GetTaskAssigneesAsync(cmd.TaskId, ct);

        var content = $"Task '{task.Title}' summary: Priority {task.Priority}, " +
                      $"assigned to {assignees.Count} user(s). " +
                      $"Overall progress: {task.Progress}%.";

        var analysis = AiAnalysis.Create(cmd.TaskId, "summary", content);
        await aiAnalysisRepo.AddAsync(analysis, ct);

        return true;
    }
}
