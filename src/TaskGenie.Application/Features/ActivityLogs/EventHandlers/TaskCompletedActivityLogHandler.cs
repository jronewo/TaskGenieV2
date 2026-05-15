using MediatR;
using TaskGenie.Application.Events;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.ActivityLogs.EventHandlers;

public class TaskCompletedActivityLogHandler(IActivityLogRepository activityLogRepository)
    : INotificationHandler<TaskCompletedEvent>
{
    public async System.Threading.Tasks.Task Handle(TaskCompletedEvent notification, CancellationToken ct)
    {
        var log = ActivityLog.Create(
            null,
            "TASK_COMPLETED",
            "TASK",
            notification.TaskId);

        await activityLogRepository.AddAsync(log, ct);
    }
}
