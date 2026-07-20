using MediatR;
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
    IMeetingRepository meetingRepo
) : IRequestHandler<UpdateMeetingCommand>
{
    public async Task Handle(UpdateMeetingCommand cmd, CancellationToken ct)
    {
        var meeting = await meetingRepo.GetByIdAsync(cmd.MeetingId, ct)
            ?? throw new InvalidOperationException($"Meeting {cmd.MeetingId} not found.");

        meeting.Update(cmd.Title, cmd.Description, cmd.ScheduledAt, cmd.EndAt, cmd.Location, cmd.Status);
        await meetingRepo.UpdateAsync(meeting, ct);
    }
}
