using MediatR;
using TaskGenie.Application.Events;
using TaskGenie.Domain.Entities;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Application.Features.Tasks.Commands;

public sealed record UpdateTaskProgressCommand(
    int TaskId,
    string? Status,
    int? Progress,
    string? RiskLevel,
    int? ActualTime
) : IRequest<bool>;

public sealed class UpdateTaskProgressCommandHandler(
    IResourceAuthorizationService authz,
    ITaskRepository taskRepo,
    ITaskDependencyRepository dependencyRepo,
    IMediator mediator
) : IRequestHandler<UpdateTaskProgressCommand, bool>
{
    public async Task<bool> Handle(UpdateTaskProgressCommand cmd, CancellationToken ct)
    {
        var task = await authz.EnsureCanUpdateTaskStatusAsync(cmd.TaskId, ct);

        // Captured before the write: the reviewer notification fires when a task *enters* review,
        // not every time progress is saved while it already sits there.
        var previousStatus = task.Status;

        // Dependency check: if marking Done, all prerequisite tasks must be Done
        if (cmd.Status == "Done")
        {
            var dependencies = await dependencyRepo.GetByTaskIdWithDetailsAsync(cmd.TaskId, ct);
            foreach (var dep in dependencies)
            {
                if (dep.DependsOnTask is not null && dep.DependsOnTask.Status != "Done")
                {
                    throw new InvalidOperationException(
                        $"Cannot complete this task because it depends on '{dep.DependsOnTask.Title}' which is not yet Done.");
                }
            }
        }

        task.UpdateProgress(
            status: cmd.Status,
            progress: cmd.Progress,
            riskLevel: cmd.RiskLevel,
            actualTime: cmd.ActualTime
        );

        await taskRepo.UpdateAsync(task, ct);

        if (task.Status == TaskStatuses.Done)
        {
            await mediator.Publish(
                new TaskCompletedEvent(task.TaskId, task.ProjectId, task.Title),
                ct);
        }
        else if (task.Status == TaskStatuses.InReview && previousStatus != TaskStatuses.InReview)
        {
            await mediator.Publish(
                new TaskSubmittedForReviewEvent(task.TaskId, task.ProjectId, task.Title),
                ct);
        }

        return true;
    }
}
