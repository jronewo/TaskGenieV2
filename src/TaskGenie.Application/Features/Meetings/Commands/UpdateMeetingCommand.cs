using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Meetings.Commands;

public sealed record UpdateMeetingCommand(
    int MeetingId,
    string? Title,
    string? Description,
    DateTime? ScheduledAt,
    DateTime? EndAt,
    string? Location,
    string? Status
) : IRequest;

public sealed class UpdateMeetingCommandHandler(
    ICurrentUser currentUser,
    IResourceAuthorizationService authorization,
    IMeetingRepository meetingRepo
) : IRequestHandler<UpdateMeetingCommand>
{
    public async Task Handle(UpdateMeetingCommand cmd, CancellationToken ct)
    {
        var meeting = await meetingRepo.GetByIdAsync(cmd.MeetingId, ct)
            ?? throw new InvalidOperationException($"Meeting {cmd.MeetingId} not found.");

        // Only the organiser, or someone who can manage the project, may change this meeting.
        if (meeting.OrganizedBy != currentUser.UserId)
            await authorization.EnsureCanManageTasksInProjectAsync(meeting.ProjectId, ct);

        meeting.Update(cmd.Title, cmd.Description, cmd.ScheduledAt, cmd.EndAt, cmd.Location, cmd.Status);
        await meetingRepo.UpdateAsync(meeting, ct);
    }
}
