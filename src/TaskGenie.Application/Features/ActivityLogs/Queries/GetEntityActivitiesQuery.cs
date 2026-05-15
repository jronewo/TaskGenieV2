using MediatR;
using TaskGenie.Application.Features.ActivityLogs;

namespace TaskGenie.Application.Features.ActivityLogs.Queries;

public record GetEntityActivitiesQuery(string EntityType, int EntityId) : IRequest<List<ActivityLogDto>>;
