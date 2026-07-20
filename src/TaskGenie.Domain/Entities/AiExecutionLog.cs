namespace TaskGenie.Domain.Entities;

public class AiExecutionLog
{
    protected AiExecutionLog() { }

    public int AiExecutionLogId { get; internal set; }
    public Guid RunId { get; internal set; }
    public int? TaskId { get; internal set; }
    public string Feature { get; internal set; } = null!;
    public string Provider { get; internal set; } = null!;
    public string ModelVersion { get; internal set; } = null!;
    public string InputSnapshot { get; internal set; } = null!;
    public string? OutputSnapshot { get; internal set; }
    public string Status { get; internal set; } = null!;
    public int LatencyMs { get; internal set; }
    public string? ErrorMessage { get; internal set; }
    public DateTime CreatedAt { get; internal set; }

    public virtual Task? Task { get; internal set; }

    public static AiExecutionLog Create(
        Guid runId,
        int? taskId,
        string feature,
        string provider,
        string modelVersion,
        string inputSnapshot,
        string? outputSnapshot,
        string status,
        int latencyMs,
        string? errorMessage = null) => new()
    {
        RunId = runId,
        TaskId = taskId,
        Feature = feature,
        Provider = provider,
        ModelVersion = modelVersion,
        InputSnapshot = inputSnapshot,
        OutputSnapshot = outputSnapshot,
        Status = status,
        LatencyMs = Math.Max(0, latencyMs),
        ErrorMessage = errorMessage,
        CreatedAt = DateTime.UtcNow
    };
}
