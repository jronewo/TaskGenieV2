using System;
using System.Collections.Generic;

namespace TaskGenie.Domain.Entities;

public class Project
{
    protected Project() { }

    public int ProjectId { get; internal set; }

    public int? TeamId { get; internal set; }

    public int? CreatedBy { get; internal set; }

    public string? Name { get; internal set; }

    public string? Description { get; internal set; }

    public string? Status { get; internal set; }

    public DateOnly? Deadline { get; internal set; }

    public int? OrganizationId { get; internal set; }

    public int? Progress { get; internal set; }

    /// <summary>
    /// Hours a member is expected to work on this project per day. Drives the capacity side of the
    /// risk estimate: a company project runs 8h days, a school project might be 2. Null means the
    /// platform default.
    /// </summary>
    public int? WorkingHoursPerDay { get; internal set; }

    public DateOnly? PredictedEndDate { get; internal set; }

    public DateTime? CreatedAt { get; internal set; }

    public DateTime? UpdatedAt { get; internal set; }

    public virtual ICollection<Task> Tasks { get; internal set; } = new List<Task>();

    public virtual Team? Team { get; internal set; }

    public virtual User? CreatedByNavigation { get; internal set; }

    public virtual Organization? Organization { get; internal set; }

    public virtual ICollection<ProjectEvaluation> ProjectEvaluations { get; internal set; } = new List<ProjectEvaluation>();

    public static Project Create(
        string name,
        string? description,
        int createdBy,
        int? organizationId = null,
        DateOnly? deadline = null) => new()
    {
        Name = name,
        Description = description,
        CreatedBy = createdBy,
        OrganizationId = organizationId,
        Deadline = deadline,
        Status = "Planning",
        Progress = 0,
        CreatedAt = DateTime.UtcNow
    };

    public void SetTeamId(int teamId) => TeamId = teamId;

    /// <summary>Only a project leader reaches this; the bounds keep a typo from making every task
    /// look either impossible or effortless.</summary>
    public void SetWorkingHoursPerDay(int hours)
    {
        if (hours is < 1 or > 24)
            throw new ArgumentOutOfRangeException(nameof(hours), "Working hours per day must be between 1 and 24.");
        WorkingHoursPerDay = hours;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>The single status a closed project carries. Anything that lists or filters
    /// projects compares against this rather than repeating the literal.</summary>
    public const string ClosedStatus = "Completed";

    public bool IsClosed => Status == ClosedStatus;

    /// <summary>
    /// Ends the project. It stays readable — the profile lists it under finished work — but drops
    /// out of the active project lists. <see cref="UpdatedAt"/> is the closure timestamp; there is
    /// no separate column for it.
    /// </summary>
    public void Close()
    {
        if (IsClosed) throw new InvalidOperationException("Dự án đã được đóng.");
        Status = ClosedStatus;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Update(string? name, string? description, string? status, int? teamId, DateOnly? deadline)
    {
        if (name is not null) Name = name;
        if (description is not null) Description = description;
        if (status is not null) Status = status;
        if (teamId.HasValue) TeamId = teamId;
        if (deadline.HasValue) Deadline = deadline;
        UpdatedAt = DateTime.UtcNow;
    }
}
