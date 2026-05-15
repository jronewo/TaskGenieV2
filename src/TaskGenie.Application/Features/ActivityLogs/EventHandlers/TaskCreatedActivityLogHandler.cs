using MediatR;
using TaskGenie.Application.Events;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.ActivityLogs.EventHandlers;

public class TaskCreatedActivityLogHandler(IActivityLogRepository activityLogRepository)
    : INotificationHandler<TaskCreatedEvent>
{
    public async System.Threading.Tasks.Task Handle(TaskCreatedEvent notification, CancellationToken ct)
    {
        var log = ActivityLog.Create(
            notification.CreatedBy,
            "TASK_CREATED",
            "TASK",
            notification.TaskId);

        await activityLogRepository.AddAsync(log, ct);
    }
}
