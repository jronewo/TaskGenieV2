using MediatR;
using TaskGenie.Application.Events;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.ActivityLogs.EventHandlers;

public class TaskAssignedActivityLogHandler(IActivityLogRepository activityLogRepository)
    : INotificationHandler<TaskAssignedEvent>
{
    public async System.Threading.Tasks.Task Handle(TaskAssignedEvent notification, CancellationToken ct)
    {
        var log = ActivityLog.Create(
            notification.AssignedUserId,
            "TASK_ASSIGNED",
            "TASK",
            notification.TaskId);

        await activityLogRepository.AddAsync(log, ct);
    }
}
