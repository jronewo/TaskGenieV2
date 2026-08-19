using TaskGenie.Application.Features.AI;
using TaskGenie.Application.Features.AI.Commands;
using TaskGenie.Application.Features.Evidence;

namespace TaskGenie.Tests.Application;

public sealed class CoreCommandValidatorTests
{
    [Fact]
    public void RiskValidator_RejectsNonPositiveTaskId()
    {
        var result = new AnalyzeTaskRiskCommandValidator().Validate(new AnalyzeTaskRiskCommand(0));
        Assert.False(result.IsValid);
    }

    [Fact]
    public void RecommendationValidator_RequiresTaskAndProject()
    {
        var result = new GetAssignmentRecommendationsCommandValidator()
            .Validate(new GetAssignmentRecommendationsCommand(0, 0));
        Assert.Equal(2, result.Errors.Count);
    }

    [Fact]
    public void EvidenceValidator_RequiresSource()
    {
        var command = new CreateTaskEvidenceCommand(1, "URL", null, null, null, null, null, null, null, null);
        var result = new CreateTaskEvidenceCommandValidator().Validate(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.ErrorMessage.Contains("Either ExternalUrl"));
    }

    [Fact]
    public void EvidenceValidator_AcceptsHttpsEvidence()
    {
        var command = new CreateTaskEvidenceCommand(
            1, "URL", "CI run", null, "https://ci.example.com/run/1", null, null, null, null, null);

        Assert.True(new CreateTaskEvidenceCommandValidator().Validate(command).IsValid);
    }
}
