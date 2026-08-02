using MediatR;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Notifications.Commands;

public class CreateNotificationCommandHandler(
    INotificationRepository notificationRepository,
    IRealtimeNotifier notifier)
    : IRequestHandler<CreateNotificationCommand, Unit>
{
    public async Task<Unit> Handle(CreateNotificationCommand request, CancellationToken ct)
    {
        var notification = Notification.Create(
            request.UserId,
            request.Type,
            request.Title,
            request.Message,
            request.ReferenceId,
            request.ReferenceType,
            request.ProjectId,
            request.ImageUrl);

        await notificationRepository.AddAsync(notification, ct);

        // Push after the row is committed, never before: the stored row is the source of truth and
        // the push is only a nudge. The dependency is required rather than optional — an optional
        // one is not filled by the container, which turns a missing registration into a silent
        // no-op instead of a startup failure.
        await notifier.PublishAsync(
            new NotificationPayload(
                notification.NotificationId,
                request.UserId,
                request.Type,
                request.Title,
                request.Message,
                request.ReferenceId,
                request.ReferenceType,
                notification.CreatedAt ?? DateTime.UtcNow),
            ct);

        return Unit.Value;
    }
}
