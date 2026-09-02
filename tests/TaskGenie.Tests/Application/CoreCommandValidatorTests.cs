using TaskGenie.Application.Features.AI;
using TaskGenie.Application.Features.AI.Commands;
using TaskGenie.Application.Features.Evidence;
using TaskGenie.Application.Features.Projects.Commands;
using TaskGenie.Application.Features.Tasks.Commands;

namespace TaskGenie.Tests.Application;

public sealed class CoreCommandValidatorTests
{
    private static CreateProjectCommand ProjectWithDeadline(DateOnly? deadline) =>
        new("Project", null, null, deadline);

    [Fact]
    public void CreateProjectValidator_RejectsDeadlineInThePast()
    {
        var yesterday = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-1);
        var result = new CreateProjectCommandValidator().Validate(ProjectWithDeadline(yesterday));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.ErrorMessage.Contains("Project deadline cannot be in the past"));
    }

    [Fact]
    public void CreateProjectValidator_AcceptsDeadlineToday()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        Assert.True(new CreateProjectCommandValidator().Validate(ProjectWithDeadline(today)).IsValid);
    }

    [Fact]
    public void CreateProjectValidator_AcceptsNoDeadline()
    {
        Assert.True(new CreateProjectCommandValidator().Validate(ProjectWithDeadline(null)).IsValid);
    }

    [Fact]
    public void CreateProjectValidator_RejectsEmptyName()
    {
        var result = new CreateProjectCommandValidator().Validate(new CreateProjectCommand("", null, null, null));
        Assert.False(result.IsValid);
    }

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

    [Fact]
    public void UpdateTaskProgressValidator_RequiresReasonForBacklog()
    {
        var command = new UpdateTaskProgressCommand(1, "Backlog", null, null, null, Reason: null);
        var result = new UpdateTaskProgressCommandValidator().Validate(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(UpdateTaskProgressCommand.Reason));
    }

    [Fact]
    public void UpdateTaskProgressValidator_AllowsBacklogWithReason()
    {
        var command = new UpdateTaskProgressCommand(1, "Backlog", null, null, null, Reason: "Login redirect is broken again.");
        Assert.True(new UpdateTaskProgressCommandValidator().Validate(command).IsValid);
    }

    [Fact]
    public void UpdateTaskProgressValidator_DoesNotRequireReasonForOtherStatuses()
    {
        var command = new UpdateTaskProgressCommand(1, "InProgress", null, null, null, Reason: null);
        Assert.True(new UpdateTaskProgressCommandValidator().Validate(command).IsValid);
    }
}
