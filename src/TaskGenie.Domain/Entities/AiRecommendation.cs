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

    public virtual User? SuggestedUser { get; internal set; }

    public virtual Task? Task { get; internal set; }

    public static AiRecommendation Create(int taskId, int suggestedUserId, double score, string reason, string recommendationType = "assign") => new()
    {
        TaskId = taskId,
        SuggestedUserId = suggestedUserId,
        Score = score,
        Reason = reason,
        RecommendationType = recommendationType
    };
}
