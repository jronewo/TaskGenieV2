using TaskGenie.Application.Features.AI.Services;

namespace TaskGenie.Tests.AI;

public sealed class RiskScoringEngineTests
{
    private readonly RiskScoringEngine _engine = new();
    private static readonly DateOnly Today = new(2026, 7, 20);

    [Fact]
    public void Calculate_CompletedTask_ReturnsZeroLowRisk()
    {
        var result = _engine.Calculate(Input(status: "Done", progress: 100, deadline: Today.AddDays(-2), reportedRisk: "blocked"));

        Assert.Equal(0, result.TotalScore);
        Assert.Equal("LOW", result.RiskLevel);
        Assert.All(result.Factors, factor => Assert.Equal(0, factor.Score));
    }

    [Fact]
    public void Calculate_OverdueTask_DeadlineFactorIsMaximum()
    {
        var result = _engine.Calculate(Input(deadline: Today.AddDays(-3), progress: 20));

        Assert.Equal(100, Factor(result, RiskFactorCodes.Deadline).Score);
    }

    [Fact]
    public void Calculate_ReportedBlocker_EscalatesDependencyFactor()
    {
        var result = _engine.Calculate(Input(reportedRisk: "API dependency is unavailable"));

        Assert.True(Factor(result, RiskFactorCodes.Dependency).Score >= 80);
        Assert.Contains(result.MitigationActions, action => action.Contains("blocker", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Calculate_MissingDeadline_AppliesUncertaintyScore()
    {
        var result = _engine.Calculate(Input(hasDeadline: false));

        Assert.Equal(20, Factor(result, RiskFactorCodes.Deadline).Score);
    }

    [Fact]
    public void Calculate_NoAssignee_AppliesWorkloadPenalty()
    {
        var result = _engine.Calculate(Input(averageActiveTasks: -1, availableHours: 0));

        Assert.True(Factor(result, RiskFactorCodes.Workload).Score >= 60);
    }

    [Fact]
    public void Calculate_PoorDeadlineHistory_ProducesHighHistoricalFactor()
    {
        var result = _engine.Calculate(Input(deadlineScore: 1));

        Assert.Equal(90, Factor(result, RiskFactorCodes.Historical).Score);
    }

    [Fact]
    public void Calculate_NoHistory_AppliesDocumentedBaseline()
    {
        var result = _engine.Calculate(Input(deadlineScore: null));

        Assert.Equal(25, Factor(result, RiskFactorCodes.Historical).Score);
    }

    [Fact]
    public void Calculate_StaleProgressUpdate_IncreasesProgressRisk()
    {
        var recent = _engine.Calculate(Input(latestProgressAt: Today.ToDateTime(TimeOnly.MinValue)));
        var stale = _engine.Calculate(Input(latestProgressAt: Today.AddDays(-14).ToDateTime(TimeOnly.MinValue)));

        Assert.True(Factor(stale, RiskFactorCodes.Progress).Score > Factor(recent, RiskFactorCodes.Progress).Score);
    }

    [Fact]
    public void Calculate_CustomWeights_AreNormalizedToOne()
    {
        var rules = new List<RiskRuleDefinition>
        {
            new(1, RiskFactorCodes.Deadline, 30, "custom-v2"),
            new(2, RiskFactorCodes.Progress, 25, "custom-v2"),
            new(3, RiskFactorCodes.Dependency, 20, "custom-v2"),
            new(4, RiskFactorCodes.Workload, 15, "custom-v2"),
            new(5, RiskFactorCodes.Historical, 10, "custom-v2")
        };

        var result = _engine.Calculate(Input(), rules);

        Assert.Equal(1, result.Factors.Sum(factor => factor.Weight), 8);
        Assert.Equal("custom-v2", result.RuleVersion);
    }

    [Theory]
    [InlineData(0, "LOW")]
    [InlineData(29.99, "LOW")]
    [InlineData(30, "MEDIUM")]
    [InlineData(59.99, "MEDIUM")]
    [InlineData(60, "HIGH")]
    [InlineData(79.99, "HIGH")]
    [InlineData(80, "CRITICAL")]
    [InlineData(100, "CRITICAL")]
    public void GetRiskLevel_UsesDocumentedBoundaries(double score, string expected) =>
        Assert.Equal(expected, RiskScoringEngine.GetRiskLevel(score));

    [Fact]
    public void Calculate_AlwaysReturnsFiveExplainableFactors()
    {
        var result = _engine.Calculate(Input());

        Assert.Equal(5, result.Factors.Count);
        Assert.All(result.Factors, factor =>
        {
            Assert.InRange(factor.Score, 0, 100);
            Assert.False(string.IsNullOrWhiteSpace(factor.RawValue));
            Assert.False(string.IsNullOrWhiteSpace(factor.Evidence));
        });
    }

    private static CalculatedRiskFactor Factor(RiskScoringResult result, string code) =>
        result.Factors.Single(factor => factor.Code == code);

    private static RiskScoringInput Input(
        string status = "InProgress",
        int progress = 50,
        DateOnly? deadline = default,
        bool hasDeadline = true,
        string? reportedRisk = null,
        double averageActiveTasks = 1,
        double availableHours = 40,
        double? deadlineScore = 8,
        DateTime? latestProgressAt = default)
    {
        DateOnly? actualDeadline = hasDeadline ? deadline ?? Today.AddDays(14) : null;
        var actualProgressAt = latestProgressAt == default ? Today.ToDateTime(TimeOnly.MinValue) : latestProgressAt;
        return new RiskScoringInput(
            Today,
            status,
            progress,
            actualDeadline,
            Today.AddDays(-14).ToDateTime(TimeOnly.MinValue),
            24,
            8,
            0,
            0,
            reportedRisk,
            actualProgressAt,
            averageActiveTasks,
            availableHours,
            deadlineScore);
    }
}
