namespace TaskGenie.Domain.Entities;

public class RiskScoreHistory
{
    protected RiskScoreHistory() { }

    public int RiskScoreHistoryId { get; internal set; }
    public Guid RunId { get; internal set; }
    public int TaskId { get; internal set; }
    public int? ProjectId { get; internal set; }
    public double TotalScore { get; internal set; }
    public string RiskLevel { get; internal set; } = null!;
    public string RuleVersion { get; internal set; } = null!;
    public string CalculationMode { get; internal set; } = null!;
    public string Explanation { get; internal set; } = null!;
    public string MitigationActions { get; internal set; } = null!;
    public DateTime CreatedAt { get; internal set; }

    public virtual Task? Task { get; internal set; }
    public virtual Project? Project { get; internal set; }
    public virtual ICollection<RiskFactor> Factors { get; internal set; } = new List<RiskFactor>();

    public static RiskScoreHistory Create(
        Guid runId,
        int taskId,
        int? projectId,
        double totalScore,
        string riskLevel,
        string ruleVersion,
        string calculationMode,
        string explanation,
        string mitigationActions) => new()
    {
        RunId = runId,
        TaskId = taskId,
        ProjectId = projectId,
        TotalScore = Math.Clamp(totalScore, 0, 100),
        RiskLevel = riskLevel,
        RuleVersion = ruleVersion,
        CalculationMode = calculationMode,
        Explanation = explanation,
        MitigationActions = mitigationActions,
        CreatedAt = DateTime.UtcNow
    };

    public void AddFactor(RiskFactor factor) => Factors.Add(factor);
}
