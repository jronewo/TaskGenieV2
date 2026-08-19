using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Notifications.Commands;

public class MarkNotificationAsReadCommandHandler(
    IResourceAuthorizationService authorization,
    INotificationRepository notificationRepository)
    : IRequestHandler<MarkNotificationAsReadCommand, bool>
{
    public async Task<bool> Handle(MarkNotificationAsReadCommand request, CancellationToken ct)
    {
        var notification = await notificationRepository.GetByIdAsync(request.NotificationId, ct)
            ?? throw new NotFoundException("Notification", request.NotificationId);

        authorization.EnsureSelfOrPlatformAdmin(notification.UserId ?? 0);

        await notificationRepository.MarkAsReadAsync(request.NotificationId, ct);
        return true;
    }
}
