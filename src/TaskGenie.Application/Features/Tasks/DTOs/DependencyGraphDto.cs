namespace TaskGenie.Application.Features.Tasks.DTOs;

public sealed class DependencyGraphDto
{
    public List<GraphNodeDto> Nodes { get; init; } = new();
    public List<GraphEdgeDto> Edges { get; init; } = new();
}

public sealed class GraphNodeDto
{
    public string Id { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string? Status { get; init; }
}

public sealed class GraphEdgeDto
{
    public string Id { get; init; } = string.Empty;
    public string Source { get; init; } = string.Empty;
    public string Target { get; init; } = string.Empty;
}
