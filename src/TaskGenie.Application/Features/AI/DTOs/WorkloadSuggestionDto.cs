namespace TaskGenie.Application.Features.AI.DTOs;

public sealed class WorkloadSuggestionDto
{
    public int ProjectId { get; init; }
    public List<WorkloadSuggestionItemDto> Suggestions { get; init; } = new();
    public DateTime GeneratedAt { get; init; } = DateTime.UtcNow;
}

public sealed class WorkloadSuggestionItemDto
{
    public int UserId { get; init; }
    public string UserName { get; init; } = string.Empty;
    public List<string> SuggestedTasks { get; init; } = new();
    public string Reason { get; init; } = string.Empty;
}
