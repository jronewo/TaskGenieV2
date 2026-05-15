using TaskGenie.Domain.Entities;

namespace TaskGenie.Application.Features.Organizations.DTOs;

public sealed class OrganizationProjectDto
{
    public int ProjectId { get; init; }
    public string Name { get; init; } = null!;
    public string? Description { get; init; }
    public string? Status { get; init; }
    public DateOnly? Deadline { get; init; }
    public int Progress { get; init; }
    public DateOnly? PredictedEndDate { get; init; }
    public string RiskLevel { get; init; } = "LOW";

    // Project Manager
    public int? PmId { get; init; }
    public string? PmName { get; init; }

    public bool IsEvaluated { get; init; }
    public int? TeamId { get; init; }
    public int TeamMemberCount { get; init; }

    public static OrganizationProjectDto FromEntity(Project p)
    {
        int totalTasks = p.Tasks.Count;
        int doneTasks = p.Tasks.Count(t => t.Status == "Done" || t.Status == "Hoàn thành");
        int calculatedProgress = totalTasks == 0
            ? 0
            : (int)Math.Round((double)doneTasks / totalTasks * 100);

        var pm = p.Team?.TeamMembers?.FirstOrDefault(tm => tm.Role == "LEADER")?.User;

        return new OrganizationProjectDto
        {
            ProjectId = p.ProjectId,
            Name = p.Name ?? "Untitled",
            Description = p.Description,
            Status = p.Status,
            Deadline = p.Deadline,
            Progress = calculatedProgress,
            PredictedEndDate = p.PredictedEndDate,
            RiskLevel = DetermineRiskLevel(p),
            PmId = pm?.UserId,
            PmName = pm?.Name,
            IsEvaluated = p.ProjectEvaluations.Any(),
            TeamId = p.TeamId,
            TeamMemberCount = p.Team?.TeamMembers.Count ?? 0
        };
    }

    private static string DetermineRiskLevel(Project p)
    {
        if (p.Status == "Completed" || p.Progress == 100) return "LOW";
        if (!p.Deadline.HasValue) return "LOW";

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysUntilDeadline = p.Deadline.Value.DayNumber - today.DayNumber;

        if (p.Tasks.Any(t => t.RiskLevel == "HIGH")) return "HIGH";
        if (daysUntilDeadline < 0) return "HIGH";
        if (daysUntilDeadline <= 5 && (p.Progress ?? 0) < 50) return "HIGH";
        if (daysUntilDeadline <= 10 && (p.Progress ?? 0) < 70) return "MEDIUM";
        if (p.PredictedEndDate.HasValue && p.PredictedEndDate.Value > p.Deadline.Value) return "HIGH";

        return "LOW";
    }
}
