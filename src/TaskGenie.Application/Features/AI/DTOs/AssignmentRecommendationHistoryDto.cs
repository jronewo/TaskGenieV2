namespace TaskGenie.Application.Features.AI.DTOs;

public sealed class AssignmentRecommendationHistoryDto
{
    public int Id { get; init; }
    public Guid RunId { get; init; }
    public int TaskId { get; init; }
    public int UserId { get; init; }
    public string UserName { get; init; } = string.Empty;
    public int Rank { get; init; }
    public double Score { get; init; }
    public double SkillMatchScore { get; init; }
    public double SemanticSimilarityScore { get; init; }
    public double WorkloadScore { get; init; }
    public double PerformanceScore { get; init; }
    public string Reason { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public int? DecidedBy { get; init; }
    public DateTime? DecidedAt { get; init; }
    public string? Outcome { get; init; }
    public string ModelVersion { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
}
