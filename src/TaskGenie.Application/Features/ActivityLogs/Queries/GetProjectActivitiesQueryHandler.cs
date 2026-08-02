using MediatR;
using TaskGenie.Application.Features.ActivityLogs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.ActivityLogs.Queries;

public class GetProjectActivitiesQueryHandler(
    IResourceAuthorizationService authorization,
    IActivityLogRepository activityLogRepository,
    IUserRepository userRepository)
    : IRequestHandler<GetProjectActivitiesQuery, List<ActivityLogDto>>
{
    public async Task<List<ActivityLogDto>> Handle(GetProjectActivitiesQuery request, CancellationToken ct)
    {
        await authorization.EnsureCanAccessProjectAsync(request.ProjectId, ct);

        var logs = await activityLogRepository.GetByProjectAsync(request.ProjectId, request.Limit, ct);

        var userIds = logs.Where(l => l.UserId.HasValue).Select(l => l.UserId!.Value).Distinct().ToList();
        var users = new Dictionary<int, string>();
        foreach (var uid in userIds)
        {
            var user = await userRepository.GetByIdAsync(uid, ct);
            if (user != null) users[uid] = user.Name ?? "Unknown";
        }

        return logs.Select(l => new ActivityLogDto
        {
            LogId = l.LogId,
            UserId = l.UserId,
            UserName = l.UserId.HasValue && users.TryGetValue(l.UserId.Value, out var name) ? name : null,
            Action = l.Action,
            EntityType = l.EntityType,
            EntityId = l.EntityId,
            CreatedAt = l.CreatedAt
        }).ToList();
    }
}
