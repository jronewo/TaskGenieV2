using MediatR;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.AI.Commands;

public sealed record GenerateTaskSummaryCommand(int TaskId) : IRequest<bool>;

public sealed class GenerateTaskSummaryCommandHandler(
    IResourceAuthorizationService authz,
    ITaskRepository taskRepo,
    IAiAnalysisRepository aiAnalysisRepo
) : IRequestHandler<GenerateTaskSummaryCommand, bool>
{
    public async Task<bool> Handle(GenerateTaskSummaryCommand cmd, CancellationToken ct)
    {
        var task = await authz.EnsureCanManageTaskAsync(cmd.TaskId, ct);

        var assignees = await taskRepo.GetTaskAssigneesAsync(cmd.TaskId, ct);

        var content = $"Task '{task.Title}' summary: Priority {task.Priority}, " +
                      $"assigned to {assignees.Count} user(s). " +
                      $"Overall progress: {task.Progress}%.";

        var analysis = AiAnalysis.Create(cmd.TaskId, "summary", content);
        await aiAnalysisRepo.AddAsync(analysis, ct);

        return true;
    }
}
