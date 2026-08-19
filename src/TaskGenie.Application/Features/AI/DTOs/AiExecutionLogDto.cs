using TaskGenie.Domain.Entities;

namespace TaskGenie.Application.Features.AI.DTOs;

public sealed class AiExecutionLogDto
{
    public Guid RunId { get; init; }
    public int? TaskId { get; init; }
    public string Feature { get; init; } = string.Empty;
    public string Provider { get; init; } = string.Empty;
    public string ModelVersion { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public int LatencyMs { get; init; }
    public string? ErrorMessage { get; init; }
    public DateTime CreatedAt { get; init; }

    public static AiExecutionLogDto FromEntity(AiExecutionLog log) => new()
    {
        RunId = log.RunId,
        TaskId = log.TaskId,
        Feature = log.Feature,
        Provider = log.Provider,
        ModelVersion = log.ModelVersion,
        Status = log.Status,
        LatencyMs = log.LatencyMs,
        ErrorMessage = log.ErrorMessage,
        CreatedAt = log.CreatedAt
    };
}
