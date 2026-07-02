using MediatR;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Meetings.Commands;

public sealed record RemoveMeetingAttendeeCommand(int MeetingId, int UserId) : IRequest;

public sealed class RemoveMeetingAttendeeCommandHandler(
    IMeetingRepository meetingRepo
) : IRequestHandler<RemoveMeetingAttendeeCommand>
{
    public async System.Threading.Tasks.Task Handle(RemoveMeetingAttendeeCommand cmd, CancellationToken ct)
    {
        var attendee = await meetingRepo.GetAttendeeAsync(cmd.MeetingId, cmd.UserId, ct)
            ?? throw new InvalidOperationException($"User {cmd.UserId} is not an attendee of meeting {cmd.MeetingId}.");

        await meetingRepo.RemoveAttendeeAsync(cmd.MeetingId, cmd.UserId, ct);
    }
}
