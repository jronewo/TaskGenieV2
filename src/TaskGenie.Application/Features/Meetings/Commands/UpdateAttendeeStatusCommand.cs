using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Meetings.Commands;

public sealed record UpdateAttendeeStatusCommand(int MeetingId, int UserId, string Status) : IRequest;

public sealed class UpdateAttendeeStatusCommandHandler(
    ICurrentUser currentUser,
    IMeetingRepository meetingRepo
) : IRequestHandler<UpdateAttendeeStatusCommand>
{
    public async Task Handle(UpdateAttendeeStatusCommand cmd, CancellationToken ct)
    {
        // Attendees answer for themselves; the organiser may set it on their behalf.
        var meeting = await meetingRepo.GetByIdAsync(cmd.MeetingId, ct)
            ?? throw new InvalidOperationException($"Meeting {cmd.MeetingId} not found.");
        if (cmd.UserId != currentUser.UserId && meeting.OrganizedBy != currentUser.UserId && !currentUser.IsPlatformAdmin)
            throw new ForbiddenException("You may only change your own attendance status.");

        var attendee = await meetingRepo.GetAttendeeAsync(cmd.MeetingId, cmd.UserId, ct)
            ?? throw new InvalidOperationException($"Attendee not found for meeting {cmd.MeetingId}.");

        attendee.UpdateStatus(cmd.Status);
        await meetingRepo.UpdateAttendeeAsync(attendee, ct);
    }
}
