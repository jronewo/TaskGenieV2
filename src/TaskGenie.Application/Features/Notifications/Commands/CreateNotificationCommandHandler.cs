using MediatR;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Notifications.Commands;

public class CreateNotificationCommandHandler(INotificationRepository notificationRepository)
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
            request.ReferenceType);

        await notificationRepository.AddAsync(notification, ct);
        return Unit.Value;
    }
}
