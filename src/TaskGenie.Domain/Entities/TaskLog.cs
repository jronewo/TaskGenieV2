using System;
using System.Collections.Generic;

namespace TaskGenie.Domain.Entities;

public class TaskLog
{
    protected TaskLog() { }

    public int LogId { get; internal set; }

    public int? TaskId { get; internal set; }

    public int? Progress { get; internal set; }

    public string? Note { get; internal set; }

    public string? Risk { get; internal set; }

    public DateTime? CreatedAt { get; internal set; }

    public virtual Task? Task { get; internal set; }

    public static TaskLog Create(int taskId, int progress, string? note, string? risk) => new()
    {
        TaskId = taskId,
        Progress = progress,
        Note = note,
        Risk = risk
    };
}
