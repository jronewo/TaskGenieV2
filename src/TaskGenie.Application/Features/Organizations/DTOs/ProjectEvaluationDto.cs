using TaskGenie.Domain.Entities;

namespace TaskGenie.Application.Features.Organizations.DTOs;

public sealed class ProjectEvaluationDto
{
    public int EvaluationId { get; init; }
    public int ProjectId { get; init; }
    public int EvaluatorId { get; init; }
    public string EvaluatorName { get; init; } = null!;
    public int? OverallScore { get; init; }
    public int? QualityScore { get; init; }
    public int? TimelinessScore { get; init; }
    public int? CommunicationScore { get; init; }
    public string? Comment { get; init; }
    public DateTime? CreatedAt { get; init; }

    public static ProjectEvaluationDto FromEntity(ProjectEvaluation e) => new()
    {
        EvaluationId = e.EvaluationId,
        ProjectId = e.ProjectId,
        EvaluatorId = e.EvaluatorId,
        EvaluatorName = e.Evaluator?.Name ?? "Unknown",
        OverallScore = e.OverallScore,
        QualityScore = e.QualityScore,
        TimelinessScore = e.TimelinessScore,
        CommunicationScore = e.CommunicationScore,
        Comment = e.Comment,
        CreatedAt = e.CreatedAt
    };
}
