using TaskGenie.Domain.Entities;

namespace TaskGenie.Application.Features.AI.DTOs;

public sealed class RiskAssessmentDto
{
    public Guid RunId { get; init; }
    public int TaskId { get; init; }
    public int? ProjectId { get; init; }
    public double TotalScore { get; init; }
    public string RiskLevel { get; init; } = string.Empty;
    public string RuleVersion { get; init; } = string.Empty;
    public string CalculationMode { get; init; } = string.Empty;
    public string Explanation { get; init; } = string.Empty;
    public List<string> MitigationActions { get; init; } = new();
    public List<RiskFactorDto> Factors { get; init; } = new();
    public DateTime CreatedAt { get; init; }

    public static RiskAssessmentDto FromEntity(RiskScoreHistory history) => new()
    {
        RunId = history.RunId,
        TaskId = history.TaskId,
        ProjectId = history.ProjectId,
        TotalScore = history.TotalScore,
        RiskLevel = history.RiskLevel,
        RuleVersion = history.RuleVersion,
        CalculationMode = history.CalculationMode,
        Explanation = history.Explanation,
        MitigationActions = history.MitigationActions
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList(),
        Factors = history.Factors.Select(RiskFactorDto.FromEntity).ToList(),
        CreatedAt = history.CreatedAt
    };
}

public sealed class RiskFactorDto
{
    public string Code { get; init; } = string.Empty;
    public string RawValue { get; init; } = string.Empty;
    public double Score { get; init; }
    public double Weight { get; init; }
    public double Contribution { get; init; }
    public string? Evidence { get; init; }

    public static RiskFactorDto FromEntity(RiskFactor factor) => new()
    {
        Code = factor.FactorCode,
        RawValue = factor.RawValue,
        Score = factor.NormalizedScore,
        Weight = factor.Weight,
        Contribution = factor.Contribution,
        Evidence = factor.Evidence
    };
}
