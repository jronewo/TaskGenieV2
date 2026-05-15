using System;
using System.Collections.Generic;

namespace TaskGenie.Domain.Entities;

public class TaskEmbedding
{
    protected TaskEmbedding() { }

    public int TaskId { get; internal set; }

    public string? Embedding { get; internal set; }

    public DateTime? CreatedAt { get; internal set; }

    public virtual Task Task { get; internal set; } = null!;

    public void UpdateEmbedding(string? embedding) => Embedding = embedding;
}
