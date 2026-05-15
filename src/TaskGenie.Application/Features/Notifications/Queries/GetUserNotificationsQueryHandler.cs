using MediatR;
using TaskGenie.Application.Features.Notifications;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Notifications.Queries;

public class GetUserNotificationsQueryHandler(INotificationRepository notificationRepository)
    : IRequestHandler<GetUserNotificationsQuery, List<NotificationDto>>
{
    public async Task<List<NotificationDto>> Handle(GetUserNotificationsQuery request, CancellationToken ct)
    {
        var notifications = await notificationRepository.GetByUserIdAsync(request.UserId, request.Limit, ct);
        return notifications.Select(n => new NotificationDto
        {
            NotificationId = n.NotificationId,
            UserId = n.UserId,
            Type = n.Type,
            Title = n.Title,
            Message = n.Message,
            ReferenceId = n.ReferenceId,
            ReferenceType = n.ReferenceType,
            IsRead = n.IsRead,
            CreatedAt = n.CreatedAt
        }).ToList();
    }
}
