using System;
using System.Collections.Generic;

namespace TaskGenie.Domain.Entities;

public class Meeting
{
    protected Meeting() { }

    public int MeetingId { get; internal set; }

    public int ProjectId { get; internal set; }

    public int OrganizedBy { get; internal set; }

    public string? Title { get; internal set; }

    public string? Description { get; internal set; }

    public DateTime ScheduledAt { get; internal set; }

    public DateTime? EndAt { get; internal set; }

    public string? Location { get; internal set; }

    public string? Status { get; internal set; }

    public DateTime? CreatedAt { get; internal set; }

    public DateTime? UpdatedAt { get; internal set; }

    public virtual Project? Project { get; internal set; }

    public virtual User? Organizer { get; internal set; }

    public virtual ICollection<MeetingAttendee> Attendees { get; internal set; } = new List<MeetingAttendee>();

    public static Meeting Create(
        int projectId,
        int organizedBy,
        string title,
        string? description,
        DateTime scheduledAt,
        DateTime? endAt = null,
        string? location = null) => new()
    {
        ProjectId = projectId,
        OrganizedBy = organizedBy,
        Title = title,
        Description = description,
        ScheduledAt = scheduledAt,
        EndAt = endAt,
        Location = location,
        Status = "Scheduled",
        CreatedAt = DateTime.UtcNow
    };

    public void Update(string? title, string? description, DateTime? scheduledAt, DateTime? endAt, string? location, string? status)
    {
        if (title is not null) Title = title;
        if (description is not null) Description = description;
        if (scheduledAt.HasValue) ScheduledAt = scheduledAt.Value;
        if (endAt.HasValue) EndAt = endAt;
        if (location is not null) Location = location;
        if (status is not null) Status = status;
        UpdatedAt = DateTime.UtcNow;
    }
}
