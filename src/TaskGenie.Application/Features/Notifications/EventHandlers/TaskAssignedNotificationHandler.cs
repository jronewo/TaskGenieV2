using MediatR;
using Microsoft.Extensions.Logging;
using TaskGenie.Application.Events;
using TaskGenie.Application.Features.Notifications.Commands;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Notifications.EventHandlers;

/// <summary>
/// Tells someone a task has been handed to them. Assignment only happens through the recommendation
/// accept flow, which a team leader drives, so the person on the receiving end would otherwise have
/// no signal at all.
/// </summary>
public sealed class TaskAssignedNotificationHandler(
    ICurrentUser currentUser,
    ITaskRepository taskRepo,
    IMediator mediator,
    ILogger<TaskAssignedNotificationHandler> logger
) : INotificationHandler<TaskAssignedEvent>
{
    public async System.Threading.Tasks.Task Handle(TaskAssignedEvent notification, CancellationToken ct)
    {
        // Assigning a task to yourself is not news.
        if (notification.AssignedUserId == currentUser.UserId) return;

        var title = string.IsNullOrWhiteSpace(notification.TaskTitle)
            ? $"Task #{notification.TaskId}"
            : notification.TaskTitle;

        try
        {
            // The notification links to a project, so the reader can jump to where the work lives.
            var task = await taskRepo.GetByIdAsync(notification.TaskId, ct);

            await mediator.Send(
                new CreateNotificationCommand(
                    notification.AssignedUserId,
                    "TASK_ASSIGNED",
                    $"Bạn được giao \"{title}\"",
                    "Trưởng nhóm vừa giao công việc này cho bạn.",
                    notification.TaskId,
                    "TASK",
                    task?.ProjectId),
                ct);
        }
        catch (Exception ex)
        {
            // A failed notification must never roll back the assignment itself.
            logger.LogWarning(ex, "Could not notify user {UserId} about task {TaskId}.",
                notification.AssignedUserId, notification.TaskId);
        }
    }
}
