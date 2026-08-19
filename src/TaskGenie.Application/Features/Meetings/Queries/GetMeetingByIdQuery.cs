using MediatR;
using TaskGenie.Application.Features.Meetings.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Meetings.Queries;

public sealed record GetMeetingByIdQuery(int MeetingId) : IRequest<MeetingDto?>;

public sealed class GetMeetingByIdQueryHandler(
    IResourceAuthorizationService authorization,
    IMeetingRepository meetingRepo
) : IRequestHandler<GetMeetingByIdQuery, MeetingDto?>
{
    public async Task<MeetingDto?> Handle(GetMeetingByIdQuery query, CancellationToken ct)
    {
        var meeting = await meetingRepo.GetByIdAsync(query.MeetingId, ct);
        if (meeting is null) return null;

        await authorization.EnsureCanAccessProjectAsync(meeting.ProjectId, ct);
        return MeetingDto.FromEntity(meeting);
    }
}
