using MediatR;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Meetings.Commands;

public sealed record DeleteMeetingCommand(int MeetingId) : IRequest;

public sealed class DeleteMeetingCommandHandler(
    IMeetingRepository meetingRepo
) : IRequestHandler<DeleteMeetingCommand>
{
    public async Task Handle(DeleteMeetingCommand cmd, CancellationToken ct)
    {
        var meeting = await meetingRepo.GetByIdAsync(cmd.MeetingId, ct)
            ?? throw new InvalidOperationException($"Meeting {cmd.MeetingId} not found.");

        await meetingRepo.DeleteAsync(meeting.MeetingId, ct);
    }
}
