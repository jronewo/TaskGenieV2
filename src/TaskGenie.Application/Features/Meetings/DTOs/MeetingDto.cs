using TaskGenie.Domain.Entities;

namespace TaskGenie.Application.Features.Meetings.DTOs;

public sealed class MeetingAttendeeDto
{
    public int UserId { get; init; }
    public string? UserName { get; init; }
    public string? UserEmail { get; init; }
    public string? Status { get; init; }

    public static MeetingAttendeeDto FromEntity(MeetingAttendee a) => new()
    {
        UserId = a.UserId,
        UserName = a.User?.Name,
        UserEmail = a.User?.Email,
        Status = a.Status
    };
}

public sealed class MeetingDto
{
    public int MeetingId { get; init; }
    public int ProjectId { get; init; }
    public string? ProjectName { get; init; }
    public int OrganizedBy { get; init; }
    public string? OrganizerName { get; init; }
    public string? Title { get; init; }
    public string? Description { get; init; }
    public DateTime ScheduledAt { get; init; }
    public DateTime? EndAt { get; init; }
    public string? Location { get; init; }
    public string? Status { get; init; }
    public DateTime? CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
    public List<MeetingAttendeeDto> Attendees { get; init; } = new();

    public static MeetingDto FromEntity(Meeting m) => new()
    {
        MeetingId = m.MeetingId,
        ProjectId = m.ProjectId,
        ProjectName = m.Project?.Name,
        OrganizedBy = m.OrganizedBy,
        OrganizerName = m.Organizer?.Name,
        Title = m.Title,
        Description = m.Description,
        ScheduledAt = m.ScheduledAt,
        EndAt = m.EndAt,
        Location = m.Location,
        Status = m.Status,
        CreatedAt = m.CreatedAt,
        UpdatedAt = m.UpdatedAt,
        Attendees = m.Attendees.Select(MeetingAttendeeDto.FromEntity).ToList()
    };
}
