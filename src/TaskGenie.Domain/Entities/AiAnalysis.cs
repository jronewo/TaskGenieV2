using System;
using System.Collections.Generic;

namespace TaskGenie.Domain.Entities;

public class AiAnalysis
{
    protected AiAnalysis() { }

    public int Id { get; internal set; }

    public int? TaskId { get; internal set; }

    public string? AnalysisType { get; internal set; }

    public string? Content { get; internal set; }

    public DateTime? CreatedAt { get; internal set; }

    public virtual Task? Task { get; internal set; }

    public static AiAnalysis Create(int taskId, string analysisType, string content) => new()
    {
        TaskId = taskId,
        AnalysisType = analysisType,
        Content = content
    };
}
