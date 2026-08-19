using MediatR;
using TaskGenie.Application.Features.Notifications;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Notifications.Queries;

public class GetUserNotificationsQueryHandler(
    IResourceAuthorizationService authorization,
    INotificationRepository notificationRepository)
    : IRequestHandler<GetUserNotificationsQuery, List<NotificationDto>>
{
    public async Task<List<NotificationDto>> Handle(GetUserNotificationsQuery request, CancellationToken ct)
    {
        authorization.EnsureSelfOrPlatformAdmin(request.UserId);

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
            ProjectId = n.ProjectId,
            ProjectName = n.Project?.Name,
            ImageUrl = n.ImageUrl,
            IsRead = n.IsRead,
            CreatedAt = n.CreatedAt
        }).ToList();
    }
}
