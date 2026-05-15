using MediatR;
using TaskGenie.Application.Features.ActivityLogs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.ActivityLogs.Queries;

public class GetEntityActivitiesQueryHandler(IActivityLogRepository activityLogRepository)
    : IRequestHandler<GetEntityActivitiesQuery, List<ActivityLogDto>>
{
    public async Task<List<ActivityLogDto>> Handle(GetEntityActivitiesQuery request, CancellationToken ct)
    {
        var logs = await activityLogRepository.GetByEntityAsync(request.EntityType, request.EntityId, ct);
        return logs.Select(l => new ActivityLogDto
        {
            LogId = l.LogId,
            UserId = l.UserId,
            Action = l.Action,
            EntityType = l.EntityType,
            EntityId = l.EntityId,
            CreatedAt = l.CreatedAt
        }).ToList();
    }
}
