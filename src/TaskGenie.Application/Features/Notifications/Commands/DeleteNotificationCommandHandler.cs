using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Notifications.Commands;

public class DeleteNotificationCommandHandler(
    IResourceAuthorizationService authorization,
    INotificationRepository notificationRepository)
    : IRequestHandler<DeleteNotificationCommand, bool>
{
    public async Task<bool> Handle(DeleteNotificationCommand request, CancellationToken ct)
    {
        var notification = await notificationRepository.GetByIdAsync(request.NotificationId, ct)
            ?? throw new NotFoundException("Notification", request.NotificationId);

        authorization.EnsureSelfOrPlatformAdmin(notification.UserId ?? 0);

        await notificationRepository.DeleteAsync(request.NotificationId, ct);
        return true;
    }
}
