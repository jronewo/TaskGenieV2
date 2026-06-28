using MediatR;
using TaskGenie.Application.Features.Meetings.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Meetings.Queries;

public sealed record GetMeetingsByUserQuery(int UserId) : IRequest<List<MeetingDto>>;

public sealed class GetMeetingsByUserQueryHandler(
    IMeetingRepository meetingRepo
) : IRequestHandler<GetMeetingsByUserQuery, List<MeetingDto>>
{
    public async Task<List<MeetingDto>> Handle(GetMeetingsByUserQuery query, CancellationToken ct)
    {
        var meetings = await meetingRepo.GetByUserIdAsync(query.UserId, ct);
        return meetings.Select(MeetingDto.FromEntity).ToList();
    }
}
