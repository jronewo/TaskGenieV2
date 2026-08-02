using MediatR;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Meetings.Commands;

public sealed record AddMeetingAttendeeCommand(int MeetingId, int UserId) : IRequest;

public sealed class AddMeetingAttendeeCommandHandler(
    ICurrentUser currentUser,
    IResourceAuthorizationService authorization,
    IMeetingRepository meetingRepo,
    IUserRepository userRepo
) : IRequestHandler<AddMeetingAttendeeCommand>
{
    public async System.Threading.Tasks.Task Handle(AddMeetingAttendeeCommand cmd, CancellationToken ct)
    {
        var meetingForAuth = await meetingRepo.GetByIdAsync(cmd.MeetingId, ct)
            ?? throw new InvalidOperationException($"Meeting {cmd.MeetingId} not found.");
        if (meetingForAuth.OrganizedBy != currentUser.UserId)
            await authorization.EnsureCanManageTasksInProjectAsync(meetingForAuth.ProjectId, ct);

        var meeting = await meetingRepo.GetByIdAsync(cmd.MeetingId, ct)
            ?? throw new InvalidOperationException($"Meeting {cmd.MeetingId} not found.");

        var user = await userRepo.GetByIdAsync(cmd.UserId, ct)
            ?? throw new InvalidOperationException($"User {cmd.UserId} not found.");

        var existing = await meetingRepo.GetAttendeeAsync(cmd.MeetingId, cmd.UserId, ct);
        if (existing is not null)
            throw new InvalidOperationException("User is already an attendee of this meeting.");

        var attendee = TaskGenie.Domain.Entities.MeetingAttendee.Create(cmd.MeetingId, cmd.UserId);
        await meetingRepo.AddAttendeeAsync(attendee, ct);
    }
}
