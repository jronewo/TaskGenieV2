using MediatR;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Notifications.Queries;

public class GetUnreadCountQueryHandler(INotificationRepository notificationRepository)
    : IRequestHandler<GetUnreadCountQuery, int>
{
    public async Task<int> Handle(GetUnreadCountQuery request, CancellationToken ct)
        => await notificationRepository.GetUnreadCountAsync(request.UserId, ct);
}
