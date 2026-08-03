namespace TaskGenie.Application.Features.Tasks.DTOs;

public sealed class DependencyGraphDto
{
    public List<GraphNodeDto> Nodes { get; init; } = new();
    public List<GraphEdgeDto> Edges { get; init; } = new();

    /// <summary>
    /// True when the stored data still contains a loop. New loops are refused on the way in, but
    /// rows created before that check existed can survive — and a viewer that quietly drew a
    /// partial diagram would hide a project nobody can ever finish.
    /// </summary>
    public bool HasCycle { get; init; }

    /// <summary>How many waves the work breaks into; 0 when the project has no tasks.</summary>
    public int LevelCount { get; init; }
}

public sealed class GraphNodeDto
{
    public string Id { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string? Status { get; init; }
    public string? Priority { get; init; }
    public string? Deadline { get; init; }
    public string? AssigneeName { get; init; }

    /// <summary>
    /// Which wave this task belongs to: 0 is work that can start immediately, 1 waits on level 0,
    /// and so on. This is the answer to "what has to be finished first" — a task can never begin
    /// before everything in the levels beneath it is done.
    /// </summary>
    public int Level { get; init; }

    /// <summary>Prerequisites that are not Done yet. Zero means it can be worked on now.</summary>
    public int BlockedByCount { get; init; }

    /// <summary>Tasks that cannot start until this one is finished.</summary>
    public int BlocksCount { get; init; }

    /// <summary>Not finished, and nothing is standing in its way.</summary>
    public bool IsReady { get; init; }

    /// <summary>Part of a loop, so it can never satisfy its own prerequisites.</summary>
    public bool InCycle { get; init; }
}

public sealed class GraphEdgeDto
{
    public string Id { get; init; } = string.Empty;

    /// <summary>The prerequisite — the task that must finish first.</summary>
    public string Source { get; init; } = string.Empty;

    /// <summary>The task that waits on it.</summary>
    public string Target { get; init; } = string.Empty;

    /// <summary>The prerequisite is still open, so this edge is actively holding work up.</summary>
    public bool IsBlocking { get; init; }
}
