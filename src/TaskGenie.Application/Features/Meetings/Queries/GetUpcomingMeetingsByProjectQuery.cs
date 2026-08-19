using MediatR;
using TaskGenie.Application.Features.Meetings.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Meetings.Queries;

public sealed record GetUpcomingMeetingsByProjectQuery(int ProjectId) : IRequest<List<MeetingDto>>;

public sealed class GetUpcomingMeetingsByProjectQueryHandler(
    IResourceAuthorizationService authorization,
    IMeetingRepository meetingRepo
) : IRequestHandler<GetUpcomingMeetingsByProjectQuery, List<MeetingDto>>
{
    public async Task<List<MeetingDto>> Handle(GetUpcomingMeetingsByProjectQuery query, CancellationToken ct)
    {
        await authorization.EnsureCanAccessProjectAsync(query.ProjectId, ct);

        var meetings = await meetingRepo.GetUpcomingByProjectAsync(query.ProjectId, ct);
        return meetings.Select(MeetingDto.FromEntity).ToList();
    }
}
