namespace TaskGenie.Application.Features.AI.Services;

public sealed record AssignmentScoreInput(
    double SkillMatch,
    double SemanticSimilarity,
    double Workload,
    double Performance);

public sealed record AssignmentScoreResult(
    double Total,
    double SkillMatch,
    double SemanticSimilarity,
    double Workload,
    double Performance);

public sealed class AssignmentScoringEngine
{
    public const string ModelVersion = "assignment-v1";
    public const double SkillMatchWeight = 0.40;
    public const double SemanticSimilarityWeight = 0.25;
    public const double WorkloadWeight = 0.20;
    public const double PerformanceWeight = 0.15;

    public AssignmentScoreResult Calculate(AssignmentScoreInput input)
    {
        var skill = Clamp(input.SkillMatch);
        var semantic = Clamp(input.SemanticSimilarity);
        var workload = Clamp(input.Workload);
        var performance = Clamp(input.Performance);
        var total = skill * SkillMatchWeight
                  + semantic * SemanticSimilarityWeight
                  + workload * WorkloadWeight
                  + performance * PerformanceWeight;

        return new AssignmentScoreResult(
            Math.Round(total, 6), skill, semantic, workload, performance);
    }

    private static double Clamp(double value) => Math.Clamp(value, 0, 1);
}
