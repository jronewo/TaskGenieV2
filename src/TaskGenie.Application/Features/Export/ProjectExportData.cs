namespace TaskGenie.Application.Features.Export;

public class ProjectExportData
{
    public int ProjectId { get; set; }
    public string ProjectName { get; set; } = null!;
    public string? Description { get; set; }
    public string? Status { get; set; }
    public string? OrganizationName { get; set; }
    public string? TeamName { get; set; }
    public DateOnly? Deadline { get; set; }
    public DateTime ExportedAt { get; set; }

    // Stats
    public int TotalTasks { get; set; }
    public int DoneTasks { get; set; }
    public int InProgressTasks { get; set; }
    public int TodoTasks { get; set; }
    public double OnTimeTaskRate { get; set; }

    public List<TaskExportRow> Tasks { get; set; } = [];
    public List<MemberExportRow> Members { get; set; } = [];
}

public class TaskExportRow
{
    public int No { get; set; }
    public string Title { get; set; } = null!;
    public string? Status { get; set; }
    public string? Priority { get; set; }
    public int? Difficulty { get; set; }
    public DateOnly? Deadline { get; set; }
    public int? Progress { get; set; }
    public int? EstimatedTime { get; set; }
    public int? ActualTime { get; set; }
    public DateTime? CompletedAt { get; set; }
    public bool? IsLate { get; set; }
    public int? DaysLateOrEarly { get; set; }
    public string Assignees { get; set; } = "";
}

public class MemberExportRow
{
    public int No { get; set; }
    public string UserName { get; set; } = null!;
    public int TotalProjectScore { get; set; }
    public string Level { get; set; } = null!;
    public int CompletedTasks { get; set; }
    public int LateTasks { get; set; }
}
