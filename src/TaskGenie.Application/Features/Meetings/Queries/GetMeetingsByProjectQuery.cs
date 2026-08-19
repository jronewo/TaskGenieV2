using MediatR;
using TaskGenie.Application.Features.Meetings.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Meetings.Queries;

public sealed record GetMeetingsByProjectQuery(int ProjectId) : IRequest<List<MeetingDto>>;

public sealed class GetMeetingsByProjectQueryHandler(
    IResourceAuthorizationService authorization,
    IMeetingRepository meetingRepo
) : IRequestHandler<GetMeetingsByProjectQuery, List<MeetingDto>>
{
    public async Task<List<MeetingDto>> Handle(GetMeetingsByProjectQuery query, CancellationToken ct)
    {
        await authorization.EnsureCanAccessProjectAsync(query.ProjectId, ct);

        var meetings = await meetingRepo.GetByProjectIdAsync(query.ProjectId, ct);
        return meetings.Select(MeetingDto.FromEntity).ToList();
    }
}
