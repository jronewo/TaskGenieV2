using MediatR;
using TaskGenie.Application.Features.ActivityLogs;

namespace TaskGenie.Application.Features.ActivityLogs.Queries;

public record GetUserActivitiesQuery(int UserId) : IRequest<List<ActivityLogDto>>;
