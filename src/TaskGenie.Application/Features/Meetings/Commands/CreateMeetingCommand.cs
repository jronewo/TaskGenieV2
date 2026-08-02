using MediatR;
using TaskGenie.Application.Features.Meetings.DTOs;
using TaskGenie.Domain.Entities;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Meetings.Commands;

public sealed record CreateMeetingCommand(
    int ProjectId,
    string Title,
    string? Description,
    DateTime ScheduledAt,
    DateTime? EndAt,
    string? Location,
    List<int> AttendeeUserIds
) : IRequest<MeetingDto>;

public sealed class CreateMeetingCommandHandler(
    ICurrentUser currentUser,
    IResourceAuthorizationService authorization,
    IMeetingRepository meetingRepo,
    IProjectRepository projectRepo,
    IUserRepository userRepo
) : IRequestHandler<CreateMeetingCommand, MeetingDto>
{
    public async Task<MeetingDto> Handle(CreateMeetingCommand cmd, CancellationToken ct)
    {
        // Scheduling is scoped to the project; the organiser is always the actor.
        var project = await authorization.EnsureCanAccessProjectAsync(cmd.ProjectId, ct);

        var meeting = Meeting.Create(
            projectId: cmd.ProjectId,
            organizedBy: currentUser.UserId,
            title: cmd.Title,
            description: cmd.Description,
            scheduledAt: cmd.ScheduledAt,
            endAt: cmd.EndAt,
            location: cmd.Location
        );
        await meetingRepo.AddAsync(meeting, ct);

        foreach (var userId in cmd.AttendeeUserIds.Distinct())
        {
            if (userId == currentUser.UserId) continue;
            var user = await userRepo.GetByIdAsync(userId, ct)
                ?? throw new InvalidOperationException($"User {userId} not found.");
            var attendee = MeetingAttendee.Create(meeting.MeetingId, userId);
            await meetingRepo.AddAttendeeAsync(attendee, ct);
        }

        var created = await meetingRepo.GetByIdAsync(meeting.MeetingId, ct);
        return MeetingDto.FromEntity(created!);
    }
}
