using System;
using System.Collections.Generic;

namespace TaskGenie.Domain.Entities;

public class AiRecommendation
{
    protected AiRecommendation() { }

    public int Id { get; internal set; }

    public int? TaskId { get; internal set; }

    public int? SuggestedUserId { get; internal set; }

    public double? Score { get; internal set; }

    public string? Reason { get; internal set; }

    public string? RecommendationType { get; internal set; }

    public Guid RunId { get; internal set; }

    public int Rank { get; internal set; }

    public double SkillMatchScore { get; internal set; }

    public double SemanticSimilarityScore { get; internal set; }

    public double WorkloadScore { get; internal set; }

    public double PerformanceScore { get; internal set; }

    public string Status { get; internal set; } = "GENERATED";

    public int? DecidedBy { get; internal set; }

    public DateTime? DecidedAt { get; internal set; }

    public string? Outcome { get; internal set; }

    public string ModelVersion { get; internal set; } = "assignment-v1";

    public DateTime CreatedAt { get; internal set; }

    public virtual User? SuggestedUser { get; internal set; }

    public virtual Task? Task { get; internal set; }

    public static AiRecommendation Create(
        int taskId,
        int suggestedUserId,
        double score,
        string reason,
        Guid? runId = null,
        int rank = 0,
        double skillMatchScore = 0,
        double semanticSimilarityScore = 0,
        double workloadScore = 0,
        double performanceScore = 0,
        string recommendationType = "assign") => new()
    {
        TaskId = taskId,
        SuggestedUserId = suggestedUserId,
        Score = score,
        Reason = reason,
        RecommendationType = recommendationType,
        RunId = runId ?? Guid.NewGuid(),
        Rank = rank,
        SkillMatchScore = skillMatchScore,
        SemanticSimilarityScore = semanticSimilarityScore,
        WorkloadScore = workloadScore,
        PerformanceScore = performanceScore,
        Status = "GENERATED",
        ModelVersion = "assignment-v1",
        CreatedAt = DateTime.UtcNow
    };

    public void RecordDecision(bool accepted, int? decidedBy, string? outcome = null)
    {
        Status = accepted ? "ACCEPTED" : "REJECTED";
        DecidedBy = decidedBy;
        DecidedAt = DateTime.UtcNow;
        Outcome = outcome;
    }
}
