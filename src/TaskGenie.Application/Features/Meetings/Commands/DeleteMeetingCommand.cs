using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Meetings.Commands;

public sealed record DeleteMeetingCommand(int MeetingId) : IRequest;

public sealed class DeleteMeetingCommandHandler(
    ICurrentUser currentUser,
    IResourceAuthorizationService authorization,
    IMeetingRepository meetingRepo
) : IRequestHandler<DeleteMeetingCommand>
{
    public async Task Handle(DeleteMeetingCommand cmd, CancellationToken ct)
    {
        var meeting = await meetingRepo.GetByIdAsync(cmd.MeetingId, ct)
            ?? throw new InvalidOperationException($"Meeting {cmd.MeetingId} not found.");

        // Only the organiser, or someone who can manage the project, may change this meeting.
        if (meeting.OrganizedBy != currentUser.UserId)
            await authorization.EnsureCanManageTasksInProjectAsync(meeting.ProjectId, ct);

        await meetingRepo.DeleteAsync(meeting.MeetingId, ct);
    }
}
