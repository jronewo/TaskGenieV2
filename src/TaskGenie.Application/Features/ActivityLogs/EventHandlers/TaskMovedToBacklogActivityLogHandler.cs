using MediatR;
using TaskGenie.Application.Events;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.ActivityLogs.EventHandlers;

public class TaskMovedToBacklogActivityLogHandler(IActivityLogRepository activityLogRepository)
    : INotificationHandler<TaskMovedToBacklogEvent>
{
    public async System.Threading.Tasks.Task Handle(TaskMovedToBacklogEvent notification, CancellationToken ct)
    {
        var log = ActivityLog.Create(
            null,
            "TASK_MOVED_TO_BACKLOG",
            "TASK",
            notification.TaskId);

        await activityLogRepository.AddAsync(log, ct);
    }
}
