using System;
using System.Collections.Generic;

namespace TaskGenie.Domain.Entities;

public class Task
{
    protected Task() { }

    public int TaskId { get; internal set; }

    public int? ProjectId { get; internal set; }

    public string? Title { get; internal set; }

    public string? Description { get; internal set; }

    public string? Priority { get; internal set; }

    public string? Status { get; internal set; }

    public DateOnly? Deadline { get; internal set; }

    public int? EstimatedTime { get; internal set; }

    public int? AiEstimatedTime { get; internal set; }

    public int? ActualTime { get; internal set; }

    public int? Difficulty { get; internal set; }

    public int? CreatedBy { get; internal set; }

    public DateTime? CreatedAt { get; internal set; }

    public int? Version { get; internal set; }

    public int? Progress { get; internal set; }

    public string? RiskLevel { get; internal set; }

    public string? AiSummary { get; internal set; }

    public DateTime? CompletedAt { get; internal set; }

    public virtual ICollection<AiAnalysis> AiAnalyses { get; internal set; } = new List<AiAnalysis>();

    public virtual ICollection<AiRecommendation> AiRecommendations { get; internal set; } = new List<AiRecommendation>();

    public virtual User? CreatedByNavigation { get; internal set; }

    public virtual Project? Project { get; internal set; }

    public virtual ICollection<TaskAssignee> TaskAssignees { get; internal set; } = new List<TaskAssignee>();

    public virtual ICollection<TaskComment> TaskComments { get; internal set; } = new List<TaskComment>();

    public virtual ICollection<TaskRequiredSkill> TaskRequiredSkills { get; internal set; } = new List<TaskRequiredSkill>();

    public virtual TaskEmbedding? TaskEmbedding { get; internal set; }

    public virtual ICollection<TaskLog> TaskLogs { get; internal set; } = new List<TaskLog>();

    public virtual ICollection<TaskDependency> DependentOnTasks { get; internal set; } = new List<TaskDependency>();

    public virtual ICollection<TaskDependency> TaskDependencies { get; internal set; } = new List<TaskDependency>();

    public static Task Create(
        int projectId,
        string title,
        string? description,
        string priority = "Medium",
        DateOnly? deadline = null,
        int? difficulty = null,
        int? createdBy = null) => new()
    {
        ProjectId = projectId,
        Title = title,
        Description = description,
        Priority = priority,
        Status = "Todo",
        Deadline = deadline,
        Difficulty = difficulty,
        CreatedBy = createdBy,
        CreatedAt = DateTime.UtcNow,
        Progress = 0,
        RiskLevel = "LOW"
    };

    public void Update(
        string? title,
        string? description,
        string? status,
        string? priority,
        DateOnly? deadline,
        int? estimatedTime,
        int? actualTime,
        int? difficulty)
    {
        if (title is not null) Title = title;
        if (description is not null) Description = description;
        if (status is not null) Status = status;
        if (priority is not null) Priority = priority;
        if (deadline.HasValue) Deadline = deadline;
        if (estimatedTime.HasValue) EstimatedTime = estimatedTime;
        if (actualTime.HasValue) ActualTime = actualTime;
        if (difficulty.HasValue) Difficulty = difficulty;
    }

    public void UpdateProgress(string? status, int? progress, string? riskLevel, int? actualTime)
    {
        if (status is not null) Status = status;
        if (progress.HasValue) Progress = progress;
        if (riskLevel is not null) RiskLevel = riskLevel;
        if (actualTime.HasValue) ActualTime = actualTime;
        if (status == "Done")
        {
            Progress = 100;
            CompletedAt = DateTime.UtcNow;
        }
    }

    public void SetAiEstimatedTime(int hours)
    {
        AiEstimatedTime = hours;
    }

    public void SetRiskAssessment(string riskLevel)
    {
        if (string.IsNullOrWhiteSpace(riskLevel))
            throw new ArgumentException("Risk level is required.", nameof(riskLevel));

        RiskLevel = riskLevel.Trim().ToUpperInvariant();
    }
}
