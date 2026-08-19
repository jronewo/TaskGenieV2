using TaskGenie.Application.Features.AI.Services;

namespace TaskGenie.Tests.AI;

public sealed class AssignmentScoringEngineTests
{
    private readonly AssignmentScoringEngine _engine = new();

    [Fact]
    public void Calculate_UsesDocumentedWeights()
    {
        var result = _engine.Calculate(new AssignmentScoreInput(1, 0.8, 0.6, 0.4));

        Assert.Equal(0.78, result.Total, 6);
    }

    [Fact]
    public void Calculate_ClampsProviderValuesToValidRange()
    {
        var result = _engine.Calculate(new AssignmentScoreInput(2, -1, 1.5, 0.5));

        Assert.InRange(result.Total, 0, 1);
        Assert.Equal(1, result.SkillMatch);
        Assert.Equal(0, result.SemanticSimilarity);
        Assert.Equal(1, result.Workload);
    }

    [Fact]
    public void Calculate_BetterSkillMatch_HasLargestSingleComponentImpact()
    {
        var baseline = _engine.Calculate(new AssignmentScoreInput(0, 0, 0, 0));
        var skill = _engine.Calculate(new AssignmentScoreInput(1, 0, 0, 0));
        var semantic = _engine.Calculate(new AssignmentScoreInput(0, 1, 0, 0));

        Assert.Equal(0, baseline.Total);
        Assert.True(skill.Total > semantic.Total);
        Assert.Equal(0.40, skill.Total, 6);
    }

    [Fact]
    public void Calculate_WorkloadBreaksTieBetweenOtherwiseEqualCandidates()
    {
        var busy = _engine.Calculate(new AssignmentScoreInput(0.8, 0.7, 0.2, 0.8));
        var available = _engine.Calculate(new AssignmentScoreInput(0.8, 0.7, 0.9, 0.8));

        Assert.True(available.Total > busy.Total);
    }

    [Fact]
    public void Weights_SumToOne()
    {
        var sum = AssignmentScoringEngine.SkillMatchWeight
                + AssignmentScoringEngine.SemanticSimilarityWeight
                + AssignmentScoringEngine.WorkloadWeight
                + AssignmentScoringEngine.PerformanceWeight;

        Assert.Equal(1, sum, 8);
    }
}
