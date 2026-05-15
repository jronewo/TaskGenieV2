using MediatR;
using TaskGenie.Application.Features.ActivityLogs;

namespace TaskGenie.Application.Features.ActivityLogs.Queries;

public record GetProjectActivitiesQuery(int ProjectId, int Limit = 50) : IRequest<List<ActivityLogDto>>;
