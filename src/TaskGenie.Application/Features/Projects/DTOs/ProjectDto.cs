using TaskGenie.Domain.Entities;

namespace TaskGenie.Application.Features.Projects.DTOs;

public sealed class ProjectDto
{
    /// <summary>Whether the caller may create or manage tasks here. Rendering hint only — the
    /// task endpoints enforce the same rule themselves.</summary>
    public bool CanManageTasks { get; set; }

    public int ProjectId { get; init; }
    public int? CreatedBy { get; init; }
    public string Name { get; init; } = null!;
    public string? Description { get; init; }
    public string? Status { get; init; }
    public int? OrganizationId { get; init; }
    public string? OrganizationName { get; init; }
    public int? TeamId { get; init; }
    public string? TeamName { get; init; }
    public DateOnly? Deadline { get; init; }
    public int Progress { get; init; }
    public DateOnly? PredictedEndDate { get; init; }

    /// <summary>Hour of day (UTC) the risk estimate re-runs by itself; null means the automation is off.</summary>
    public int? RiskAutomationHourUtc { get; init; }

    public DateTime? RiskAutomationLastRunAt { get; init; }
    public string RiskLevel { get; init; } = "LOW";
    public DateTime? CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }

    public static ProjectDto FromEntity(Project p) => new()
    {
        ProjectId = p.ProjectId,
        CreatedBy = p.CreatedBy,
        Name = p.Name ?? "Untitled Project",
        Description = p.Description,
        Status = p.Status,
        OrganizationId = p.OrganizationId,
        OrganizationName = p.Organization?.Name,
        TeamId = p.TeamId,
        TeamName = p.Team?.Name,
        Deadline = p.Deadline,
        Progress = p.Progress ?? 0,
        PredictedEndDate = p.PredictedEndDate,
        RiskAutomationHourUtc = p.RiskAutomationHourUtc,
        RiskAutomationLastRunAt = p.RiskAutomationLastRunAt,
        RiskLevel = "LOW",
        CreatedAt = p.CreatedAt,
        UpdatedAt = p.UpdatedAt
    };
}
