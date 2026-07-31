using MediatR;
using TaskGenie.Application.Features.Meetings.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Meetings.Queries;

public sealed record GetMeetingByIdQuery(int MeetingId) : IRequest<MeetingDto?>;

public sealed class GetMeetingByIdQueryHandler(
    IMeetingRepository meetingRepo
) : IRequestHandler<GetMeetingByIdQuery, MeetingDto?>
{
    public async Task<MeetingDto?> Handle(GetMeetingByIdQuery query, CancellationToken ct)
    {
        var meeting = await meetingRepo.GetByIdAsync(query.MeetingId, ct);
        return meeting is not null ? MeetingDto.FromEntity(meeting) : null;
    }
}
