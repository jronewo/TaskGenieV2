namespace TaskGenie.Application.Features.AI.DTOs;

public sealed class TaskAssignmentResponseDto
{
    public int TaskId { get; init; }
    public string? TaskTitle { get; init; }
    public List<TaskSkillRequirementDto> RequiredSkills { get; init; } = new();
    public List<AiSuggestionResultDto> Suggestions { get; init; } = new();
    public DateTime GeneratedAt { get; init; } = DateTime.UtcNow;
}

public sealed class TaskSkillRequirementDto
{
    public int SkillId { get; init; }
    public string SkillName { get; init; } = string.Empty;
    public int RequiredLevel { get; init; }
}

public sealed class AiSuggestionResultDto
{
    public int UserId { get; init; }
    public string UserName { get; init; } = string.Empty;
    public double Score { get; init; }
    public string Reason { get; init; } = string.Empty;
    public double SkillMatchScore { get; init; }
    public double SemanticSimilarityScore { get; init; }
    public double WorkloadScore { get; init; }
    public double PerformanceScore { get; init; }
}
