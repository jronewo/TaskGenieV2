using TaskGenie.Domain.Entities;

namespace TaskGenie.Application.Features.AI.DTOs;

public sealed class AiAnalysisDto
{
    public int Id { get; init; }
    public int? TaskId { get; init; }
    public string? AnalysisType { get; init; }
    public string? Content { get; init; }
    public DateTime? CreatedAt { get; init; }

    public static AiAnalysisDto FromEntity(AiAnalysis a) => new()
    {
        Id = a.Id,
        TaskId = a.TaskId,
        AnalysisType = a.AnalysisType,
        Content = a.Content,
        CreatedAt = a.CreatedAt
    };
}
