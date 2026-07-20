namespace TaskGenie.Application.Features.Projects.DTOs;

public class ProjectSummaryDto
{
    public int ProjectId { get; set; }
    public string? ProjectName { get; set; }
    public DateOnly? Deadline { get; set; }
    public DateOnly ClosedAt { get; set; }

    // "Early" | "OnTime" | "Late"
    public string ProjectCompletionStatus { get; set; } = null!;
    // positive = days early, negative = days late
    public int DaysVsDeadline { get; set; }

    // Task stats
    public int TotalTasks { get; set; }
    public int DoneTasks { get; set; }
    public int InProgressTasks { get; set; }
    public int TodoTasks { get; set; }
    // % of Done tasks that were completed before their own deadline
    public double OnTimeTaskRate { get; set; }

    // Scores awarded at project closure to each member
    public int ProjectClosureScorePerMember { get; set; }
    public string ProjectClosureScoreType { get; set; } = null!; // "REWARD" | "PENALTY"

    // Per-member breakdown: total score earned inside this project
    public List<ProjectMemberScoreDto> MemberScores { get; set; } = [];
}

public class ProjectMemberScoreDto
{
    public int UserId { get; set; }
    public string? UserName { get; set; }
    public string? Avatar { get; set; }
    public string Level { get; set; } = null!;
    // Score accumulated from tasks in this project (before closure bonus)
    public int TaskScore { get; set; }
    // Bonus/penalty from project closure
    public int ClosureScore { get; set; }
    public int TotalProjectScore { get; set; }
}
