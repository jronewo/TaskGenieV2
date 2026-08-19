using MediatR;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Notifications.Queries;

public class GetUnreadCountQueryHandler(
    IResourceAuthorizationService authorization,
    INotificationRepository notificationRepository)
    : IRequestHandler<GetUnreadCountQuery, int>
{
    public async Task<int> Handle(GetUnreadCountQuery request, CancellationToken ct)
    {
        authorization.EnsureSelfOrPlatformAdmin(request.UserId);
        return await notificationRepository.GetUnreadCountAsync(request.UserId, ct);
    }
}
