using TaskGenie.Application.Features.Tasks.Commands;

namespace TaskGenie.Tests.Application;

public sealed class TaskDateOrderValidatorTests
{
    [Fact]
    public void CreateValidator_AcceptsStartDateOnOrBeforeDeadline()
    {
        var command = new CreateTaskCommand(1, "Task", null, "Medium", "2026-09-10", "2026-09-01", null);
        Assert.True(new CreateTaskCommandValidator().Validate(command).IsValid);
    }

    [Fact]
    public void CreateValidator_RejectsStartDateAfterDeadline()
    {
        var command = new CreateTaskCommand(1, "Task", null, "Medium", "2026-09-01", "2026-09-10", null);
        var result = new CreateTaskCommandValidator().Validate(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.ErrorMessage.Contains("Start date must be on or before the deadline"));
    }

    [Fact]
    public void CreateValidator_AcceptsOnlyOneDatePresent()
    {
        var onlyDeadline = new CreateTaskCommand(1, "Task", null, "Medium", "2026-09-10", null, null);
        var onlyStart = new CreateTaskCommand(1, "Task", null, "Medium", null, "2026-09-01", null);

        Assert.True(new CreateTaskCommandValidator().Validate(onlyDeadline).IsValid);
        Assert.True(new CreateTaskCommandValidator().Validate(onlyStart).IsValid);
    }

    [Fact]
    public void UpdateValidator_AcceptsStartDateOnOrBeforeDeadline()
    {
        var command = new UpdateTaskCommand(1, null, null, null, null, "2026-09-10", "2026-09-01", null, null, null);
        Assert.True(new UpdateTaskCommandValidator().Validate(command).IsValid);
    }

    [Fact]
    public void UpdateValidator_RejectsStartDateAfterDeadline()
    {
        var command = new UpdateTaskCommand(1, null, null, null, null, "2026-09-01", "2026-09-10", null, null, null);
        var result = new UpdateTaskCommandValidator().Validate(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.ErrorMessage.Contains("Start date must be on or before the deadline"));
    }

    [Fact]
    public void UpdateValidator_AcceptsOnlyOneDatePresent()
    {
        var onlyDeadline = new UpdateTaskCommand(1, null, null, null, null, "2026-09-10", null, null, null, null);
        var onlyStart = new UpdateTaskCommand(1, null, null, null, null, null, "2026-09-01", null, null, null);

        Assert.True(new UpdateTaskCommandValidator().Validate(onlyDeadline).IsValid);
        Assert.True(new UpdateTaskCommandValidator().Validate(onlyStart).IsValid);
    }
}
