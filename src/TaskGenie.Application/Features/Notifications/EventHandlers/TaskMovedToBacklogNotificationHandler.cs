using MediatR;
using Microsoft.Extensions.Logging;
using TaskGenie.Application.Events;
using TaskGenie.Application.Features.Notifications.Commands;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Notifications.EventHandlers;

/// <summary>
/// Tells the current assignee their task bounced back to Backlog because of a bug. Only fires for
/// an assignee the task already had — a task that had nobody gets a fresh assignment right after
/// this event through the normal assign/accept-recommendation flow, which already notifies on its
/// own via <see cref="TaskAssignedNotificationHandler"/>.
/// </summary>
public sealed class TaskMovedToBacklogNotificationHandler(
    ICurrentUser currentUser,
    ITaskRepository taskRepo,
    IMediator mediator,
    ILogger<TaskMovedToBacklogNotificationHandler> logger
) : INotificationHandler<TaskMovedToBacklogEvent>
{
    public async System.Threading.Tasks.Task Handle(TaskMovedToBacklogEvent notification, CancellationToken ct)
    {
        var title = string.IsNullOrWhiteSpace(notification.Title)
            ? $"Task #{notification.TaskId}"
            : notification.Title;

        try
        {
            var assignees = await taskRepo.GetTaskAssigneesAsync(notification.TaskId, ct);

            foreach (var assignee in assignees)
            {
                if (assignee.UserId is not { } assigneeUserId) continue;
                // Moving your own task back is not news.
                if (assigneeUserId == currentUser.UserId) continue;

                await mediator.Send(
                    new CreateNotificationCommand(
                        assigneeUserId,
                        "TASK_MOVED_TO_BACKLOG",
                        $"\"{title}\" đã chuyển về Backlog",
                        string.IsNullOrWhiteSpace(notification.Reason)
                            ? "Có lỗi phát sinh với công việc này."
                            : notification.Reason,
                        notification.TaskId,
                        "TASK",
                        notification.ProjectId),
                    ct);
            }
        }
        catch (Exception ex)
        {
            // A failed notification must never roll back the status change itself.
            logger.LogWarning(ex, "Could not notify assignees about task {TaskId} moving to Backlog.",
                notification.TaskId);
        }
    }
}
