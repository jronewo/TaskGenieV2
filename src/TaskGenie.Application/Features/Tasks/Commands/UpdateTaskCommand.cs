using MediatR;
using TaskGenie.Application.Events;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Application.Features.Tasks.Commands;

public sealed record UpdateTaskCommand(
    int TaskId,
    string? Title,
    string? Description,
    string? Status,
    string? Priority,
    string? Deadline,
    int? EstimatedTime,
    int? ActualTime,
    int? Difficulty
) : IRequest<bool>;

public sealed class UpdateTaskCommandHandler(
    IResourceAuthorizationService authz,
    ITaskRepository taskRepo,
    IMediator mediator
) : IRequestHandler<UpdateTaskCommand, bool>
{
    public async Task<bool> Handle(UpdateTaskCommand cmd, CancellationToken ct)
    {
        var task = await authz.EnsureCanManageTaskAsync(cmd.TaskId, ct);
        if (task.ProjectId is null) return false;

        var deadline = !string.IsNullOrEmpty(cmd.Deadline) && DateOnly.TryParse(cmd.Deadline, out var dl) ? dl : (DateOnly?)null;

        task.Update(
            title: cmd.Title,
            description: cmd.Description,
            status: cmd.Status,
            priority: cmd.Priority,
            deadline: deadline,
            estimatedTime: cmd.EstimatedTime,
            actualTime: cmd.ActualTime,
            difficulty: cmd.Difficulty
        );

        await taskRepo.UpdateAsync(task, ct);

        await mediator.Publish(new TaskUpdatedEvent(task.TaskId, task.ProjectId.Value, task.Title), ct);

        if (cmd.Status == "Done")
            await mediator.Publish(new TaskCompletedEvent(task.TaskId, task.ProjectId, task.Title), ct);

        return true;
    }
}
