using MediatR;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Meetings.Commands;

public sealed record UpdateAttendeeStatusCommand(int MeetingId, int UserId, string Status) : IRequest;

public sealed class UpdateAttendeeStatusCommandHandler(
    IMeetingRepository meetingRepo
) : IRequestHandler<UpdateAttendeeStatusCommand>
{
    public async Task Handle(UpdateAttendeeStatusCommand cmd, CancellationToken ct)
    {
        var attendee = await meetingRepo.GetAttendeeAsync(cmd.MeetingId, cmd.UserId, ct)
            ?? throw new InvalidOperationException($"Attendee not found for meeting {cmd.MeetingId}.");

        attendee.UpdateStatus(cmd.Status);
        await meetingRepo.UpdateAttendeeAsync(attendee, ct);
    }
}
