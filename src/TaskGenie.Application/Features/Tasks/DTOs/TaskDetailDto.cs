using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Application.Features.Tasks.DTOs;

public sealed class TaskDetailDto
{
    public int TaskId { get; init; }
    public int? ProjectId { get; init; }
    public string? Title { get; init; }
    public string? Description { get; init; }
    public string? Status { get; init; }
    public string? Priority { get; init; }
    public DateOnly? Deadline { get; init; }
    public int? EstimatedTime { get; init; }
    public int? AiEstimatedTime { get; init; }
    public int? ActualTime { get; init; }
    public int? Progress { get; init; }
    public string? RiskLevel { get; init; }
    public string? AiSummary { get; init; }
    public DateTime? CreatedAt { get; init; }
    public DateTime? CompletedAt { get; init; }
    public int? CreatedBy { get; init; }
    public bool IsLate => Deadline.HasValue && CompletedAt.HasValue
        && DateOnly.FromDateTime(CompletedAt.Value) > Deadline.Value;
    public int? DaysLateOrEarly => Deadline.HasValue && CompletedAt.HasValue
        ? Deadline.Value.DayNumber - DateOnly.FromDateTime(CompletedAt.Value).DayNumber
        : null;

    public List<TaskAssigneeDto> Assignees { get; init; } = new();
    public List<TaskDependencyDto> Dependencies { get; init; } = new();
    public List<int> RequiredSkillIds { get; init; } = new();

    public static TaskDetailDto FromEntity(TaskEntity t) => new()
    {
        TaskId = t.TaskId,
        ProjectId = t.ProjectId,
        Title = t.Title,
        Description = t.Description,
        Status = t.Status,
        Priority = t.Priority,
        Deadline = t.Deadline,
        EstimatedTime = t.EstimatedTime,
        AiEstimatedTime = t.AiEstimatedTime,
        ActualTime = t.ActualTime,
        Progress = t.Progress,
        RiskLevel = t.RiskLevel,
        AiSummary = t.AiSummary,
        CreatedAt = t.CreatedAt,
        CompletedAt = t.CompletedAt,
        CreatedBy = t.CreatedBy,
        Assignees = t.TaskAssignees
            .Select(ta => new TaskAssigneeDto
            {
                UserId = ta.User?.UserId ?? 0,
                UserName = ta.User?.Name,
                Avatar = ta.User?.Avatar
            }).ToList(),
        Dependencies = t.TaskDependencies
            .Select(td => new TaskDependencyDto
            {
                DependencyId = td.DependencyId,
                DependsOnTaskId = td.DependsOnTaskId,
                DependsOnTaskTitle = td.DependsOnTask?.Title,
                Status = td.DependsOnTask?.Status
            }).ToList(),
        RequiredSkillIds = t.TaskRequiredSkills
            .Where(s => s.SkillId.HasValue)
            .Select(s => s.SkillId!.Value)
            .ToList()
    };
}

public sealed class TaskAssigneeDto
{
    public int UserId { get; init; }
    public string? UserName { get; init; }
    public string? Avatar { get; init; }
}

public sealed class TaskDependencyDto
{
    public int DependencyId { get; init; }
    public int DependsOnTaskId { get; init; }
    public string? DependsOnTaskTitle { get; init; }
    public string? Status { get; init; }
}
