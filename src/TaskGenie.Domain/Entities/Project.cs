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
