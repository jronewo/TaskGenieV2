namespace TaskGenie.Domain.Entities;

public class RiskFactor
{
    protected RiskFactor() { }

    public int RiskFactorId { get; internal set; }
    public int RiskScoreHistoryId { get; internal set; }
    public int? RiskRuleId { get; internal set; }
    public string FactorCode { get; internal set; } = null!;
    public string RawValue { get; internal set; } = null!;
    public double NormalizedScore { get; internal set; }
    public double Weight { get; internal set; }
    public double Contribution { get; internal set; }
    public string? Evidence { get; internal set; }
    public DateTime CreatedAt { get; internal set; }

    public virtual RiskScoreHistory? RiskScoreHistory { get; internal set; }
    public virtual RiskRule? RiskRule { get; internal set; }

    public static RiskFactor Create(
        int? riskRuleId,
        string factorCode,
        string rawValue,
        double normalizedScore,
        double weight,
        double contribution,
        string? evidence) => new()
    {
        RiskRuleId = riskRuleId,
        FactorCode = factorCode,
        RawValue = rawValue,
        NormalizedScore = Math.Clamp(normalizedScore, 0, 100),
        Weight = weight,
        Contribution = contribution,
        Evidence = evidence,
        CreatedAt = DateTime.UtcNow
    };
}
