using MediatR;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Notifications.Commands;

public class MarkAllNotificationsAsReadCommandHandler(
    IResourceAuthorizationService authorization,
    INotificationRepository notificationRepository)
    : IRequestHandler<MarkAllNotificationsAsReadCommand, Unit>
{
    public async Task<Unit> Handle(MarkAllNotificationsAsReadCommand request, CancellationToken ct)
    {
        authorization.EnsureSelfOrPlatformAdmin(request.UserId);
        await notificationRepository.MarkAllAsReadAsync(request.UserId, ct);
        return Unit.Value;
    }
}
