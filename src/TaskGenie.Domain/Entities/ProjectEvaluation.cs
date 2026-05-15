using System;
using System.Collections.Generic;

namespace TaskGenie.Domain.Entities;

public class ProjectEvaluation
{
    protected ProjectEvaluation() { }

    public int EvaluationId { get; internal set; }

    public int ProjectId { get; internal set; }

    public int EvaluatorId { get; internal set; }

    public int? OverallScore { get; internal set; }

    public int? QualityScore { get; internal set; }

    public int? TimelinessScore { get; internal set; }

    public int? CommunicationScore { get; internal set; }

    public string? Comment { get; internal set; }

    public DateTime? CreatedAt { get; internal set; }

    public virtual User Evaluator { get; internal set; } = null!;

    public virtual Project Project { get; internal set; } = null!;

    public static ProjectEvaluation Create(
        int projectId,
        int evaluatorId,
        int? overallScore,
        int? qualityScore,
        int? timelinessScore,
        int? communicationScore,
        string? comment) => new()
    {
        ProjectId = projectId,
        EvaluatorId = evaluatorId,
        OverallScore = overallScore,
        QualityScore = qualityScore,
        TimelinessScore = timelinessScore,
        CommunicationScore = communicationScore,
        Comment = comment,
        CreatedAt = DateTime.UtcNow
    };
}
