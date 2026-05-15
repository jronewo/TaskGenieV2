using MediatR;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Notifications.Commands;

public class MarkAllNotificationsAsReadCommandHandler(INotificationRepository notificationRepository)
    : IRequestHandler<MarkAllNotificationsAsReadCommand, Unit>
{
    public async Task<Unit> Handle(MarkAllNotificationsAsReadCommand request, CancellationToken ct)
    {
        await notificationRepository.MarkAllAsReadAsync(request.UserId, ct);
        return Unit.Value;
    }
}
