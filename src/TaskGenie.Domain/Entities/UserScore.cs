using System;
using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Domain.Entities;

public class UserScore
{
    protected UserScore() { } // EF Core

    public int Id { get; internal set; }
    public int UserId { get; internal set; }
    public int? TaskId { get; internal set; }
    public int? ProjectId { get; internal set; }

    public string Type { get; internal set; } = null!;   // "REWARD" | "PENALTY"
    public int Amount { get; internal set; }
    public string? Reason { get; internal set; }
    public DateTime CreatedAt { get; internal set; }

    public virtual User? User { get; internal set; }
    public virtual TaskEntity? Task { get; internal set; }
    public virtual Project? Project { get; internal set; }

    public static UserScore CreateReward(
        int userId, int amount, string reason,
        int? taskId = null, int? projectId = null)
        => new()
        {
            UserId = userId,
            Amount = amount,
            Reason = reason,
            Type = "REWARD",
            TaskId = taskId,
            ProjectId = projectId,
            CreatedAt = DateTime.UtcNow
        };

    public static UserScore CreatePenalty(
        int userId, int amount, string reason,
        int? taskId = null, int? projectId = null)
        => new()
        {
            UserId = userId,
            Amount = -Math.Abs(amount),       // 👈 store as negative so SUM works
            Reason = reason,
            Type = "PENALTY",
            TaskId = taskId,
            ProjectId = projectId,
            CreatedAt = DateTime.UtcNow
        };
}