using MediatR;
using TaskGenie.Application.Features.ActivityLogs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.ActivityLogs.Queries;

public class GetUserActivitiesQueryHandler(
    IActivityLogRepository activityLogRepository,
    IUserRepository userRepository)
    : IRequestHandler<GetUserActivitiesQuery, List<ActivityLogDto>>
{
    public async Task<List<ActivityLogDto>> Handle(GetUserActivitiesQuery request, CancellationToken ct)
    {
        var logs = await activityLogRepository.GetByUserIdAsync(request.UserId, ct);
        var user = await userRepository.GetByIdAsync(request.UserId, ct);

        return logs.Select(l => new ActivityLogDto
        {
            LogId = l.LogId,
            UserId = l.UserId,
            UserName = user?.Name,
            Action = l.Action,
            EntityType = l.EntityType,
            EntityId = l.EntityId,
            CreatedAt = l.CreatedAt
        }).ToList();
    }
}
