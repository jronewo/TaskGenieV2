using System.Linq;
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
    int? ActualTime,
    string? Reason = null,
    bool Force = false,
    IReadOnlyList<int>? ForceDependencyTaskIds = null
) : IRequest<bool>;

public sealed class UpdateTaskProgressCommandHandler(
    IResourceAuthorizationService authz,
    ITaskRepository taskRepo,
    ITaskDependencyRepository dependencyRepo,
    ITaskLogRepository taskLogRepo,
    IMediator mediator
) : IRequestHandler<UpdateTaskProgressCommand, bool>
{
    public async Task<bool> Handle(UpdateTaskProgressCommand cmd, CancellationToken ct)
    {
        var task = await authz.EnsureCanUpdateTaskStatusAsync(cmd.TaskId, ct);

        // Captured before the write: the reviewer notification fires when a task *enters* review,
        // not every time progress is saved while it already sits there.
        var previousStatus = task.Status;

        // Reporting your own progress is not administrative, but the final sign-off is: only a Lead
        // may close the loop on someone else's review.
        if (cmd.Status == TaskStatuses.Done)
        {
            await authz.EnsureCanManageTaskAsync(cmd.TaskId, ct);
        }

        // Dependency check: if marking Done, all prerequisite tasks must be Done — unless a Lead is
        // explicitly forcing it through, in which case only the dependencies they picked get dragged
        // to Done with it. Anything left unchecked stays exactly where it was.
        if (cmd.Status == "Done")
        {
            var dependencies = await dependencyRepo.GetByTaskIdWithDetailsAsync(cmd.TaskId, ct);
            var openDependencies = dependencies
                .Where(dep => dep.DependsOnTask is not null && dep.DependsOnTask.Status != "Done")
                .ToList();

            if (openDependencies.Count > 0 && !cmd.Force)
            {
                var blocker = openDependencies[0].DependsOnTask!;
                throw new InvalidOperationException(
                    $"Cannot complete this task because it depends on '{blocker.Title}' which is not yet Done.");
            }

            if (openDependencies.Count > 0 && cmd.Force && cmd.ForceDependencyTaskIds is { Count: > 0 })
            {
                // Never trust the client's id list beyond what it's actually allowed to touch: only
                // dependencies that are genuinely open and genuinely block this task qualify.
                var forceableIds = openDependencies
                    .Select(dep => dep.DependsOnTaskId)
                    .Intersect(cmd.ForceDependencyTaskIds)
                    .ToList();

                foreach (var dependencyTaskId in forceableIds)
                {
                    var dependencyTask = await taskRepo.GetByIdAsync(dependencyTaskId, ct);
                    if (dependencyTask is null) continue;

                    dependencyTask.UpdateProgress(status: TaskStatuses.Done, progress: 100, riskLevel: null, actualTime: null);
                    await taskRepo.UpdateAsync(dependencyTask, ct);

                    await mediator.Publish(
                        new TaskCompletedEvent(dependencyTask.TaskId, dependencyTask.ProjectId, dependencyTask.Title),
                        ct);
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
        else if (task.Status == TaskStatuses.Backlog)
        {
            var log = TaskLog.Create(task.TaskId, task.Progress ?? 0, cmd.Reason, risk: null);
            await taskLogRepo.AddAsync(log, ct);

            await mediator.Publish(
                new TaskMovedToBacklogEvent(task.TaskId, task.ProjectId, task.Title, cmd.Reason),
                ct);
        }

        return true;
    }
}
