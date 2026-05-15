namespace TaskGenie.Application.Features.Tasks.DTOs;

public sealed class TaskLogDto
{
    public int LogId { get; init; }
    public int? TaskId { get; init; }
    public int? Progress { get; init; }
    public string? Note { get; init; }
    public string? Risk { get; init; }
    public DateTime? CreatedAt { get; init; }

    public static TaskLogDto FromEntity(TaskGenie.Domain.Entities.TaskLog log) => new()
    {
        LogId = log.LogId,
        TaskId = log.TaskId,
        Progress = log.Progress,
        Note = log.Note,
        Risk = log.Risk,
        CreatedAt = log.CreatedAt
    };
}
