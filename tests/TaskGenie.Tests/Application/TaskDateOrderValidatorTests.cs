using Moq;
using TaskGenie.Application.Features.Tasks.Commands;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Tests.Application;

public sealed class TaskDateOrderValidatorTests
{
    private static Mock<IProjectRepository> ProjectRepoReturning(Project? project)
    {
        var mock = new Mock<IProjectRepository>();
        mock.Setup(r => r.GetByIdAsync(It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync(project);
        return mock;
    }

    private static Mock<ITaskRepository> TaskRepoReturning(TaskEntity? task)
    {
        var mock = new Mock<ITaskRepository>();
        mock.Setup(r => r.GetByIdAsync(It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync(task);
        return mock;
    }

    [Fact]
    public async System.Threading.Tasks.Task CreateValidator_AcceptsStartDateOnOrBeforeDeadline()
    {
        var command = new CreateTaskCommand(1, "Task", null, "Medium", "2026-09-10", "2026-09-01", null);
        var validator = new CreateTaskCommandValidator(ProjectRepoReturning(null).Object);

        Assert.True((await validator.ValidateAsync(command)).IsValid);
    }

    [Fact]
    public async System.Threading.Tasks.Task CreateValidator_RejectsStartDateAfterDeadline()
    {
        var command = new CreateTaskCommand(1, "Task", null, "Medium", "2026-09-01", "2026-09-10", null);
        var validator = new CreateTaskCommandValidator(ProjectRepoReturning(null).Object);
        var result = await validator.ValidateAsync(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.ErrorMessage.Contains("Start date must be on or before the deadline"));
    }

    [Fact]
    public async System.Threading.Tasks.Task CreateValidator_AcceptsOnlyOneDatePresent()
    {
        var onlyDeadline = new CreateTaskCommand(1, "Task", null, "Medium", "2026-09-10", null, null);
        var onlyStart = new CreateTaskCommand(1, "Task", null, "Medium", null, "2026-09-01", null);
        var validator = new CreateTaskCommandValidator(ProjectRepoReturning(null).Object);

        Assert.True((await validator.ValidateAsync(onlyDeadline)).IsValid);
        Assert.True((await validator.ValidateAsync(onlyStart)).IsValid);
    }

    [Fact]
    public async System.Threading.Tasks.Task CreateValidator_RejectsTaskDeadlineAfterProjectDeadline()
    {
        var project = Project.Create("Project", null, createdBy: 1, deadline: new DateOnly(2026, 9, 5));
        var command = new CreateTaskCommand(1, "Task", null, "Medium", "2026-09-10", null, null);
        var validator = new CreateTaskCommandValidator(ProjectRepoReturning(project).Object);
        var result = await validator.ValidateAsync(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.ErrorMessage.Contains("project's deadline"));
    }

    [Fact]
    public async System.Threading.Tasks.Task CreateValidator_AcceptsTaskDeadlineOnOrBeforeProjectDeadline()
    {
        var project = Project.Create("Project", null, createdBy: 1, deadline: new DateOnly(2026, 9, 10));
        var command = new CreateTaskCommand(1, "Task", null, "Medium", "2026-09-10", null, null);
        var validator = new CreateTaskCommandValidator(ProjectRepoReturning(project).Object);

        Assert.True((await validator.ValidateAsync(command)).IsValid);
    }

    [Fact]
    public async System.Threading.Tasks.Task CreateValidator_AcceptsTaskDeadlineWhenProjectHasNoDeadline()
    {
        var project = Project.Create("Project", null, createdBy: 1, deadline: null);
        var command = new CreateTaskCommand(1, "Task", null, "Medium", "2026-09-10", null, null);
        var validator = new CreateTaskCommandValidator(ProjectRepoReturning(project).Object);

        Assert.True((await validator.ValidateAsync(command)).IsValid);
    }

    [Fact]
    public async System.Threading.Tasks.Task CreateValidator_RejectsStartDateAfterProjectDeadline_WhenTaskHasNoDeadline()
    {
        var project = Project.Create("Project", null, createdBy: 1, deadline: new DateOnly(2026, 9, 5));
        var command = new CreateTaskCommand(1, "Task", null, "Medium", null, "2026-09-10", null);
        var validator = new CreateTaskCommandValidator(ProjectRepoReturning(project).Object);
        var result = await validator.ValidateAsync(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.ErrorMessage.Contains("start date cannot be later than the project's deadline"));
    }

    [Fact]
    public async System.Threading.Tasks.Task UpdateValidator_AcceptsStartDateOnOrBeforeDeadline()
    {
        var command = new UpdateTaskCommand(1, null, null, null, null, "2026-09-10", "2026-09-01", null, null, null);
        var validator = new UpdateTaskCommandValidator(TaskRepoReturning(null).Object, ProjectRepoReturning(null).Object);

        Assert.True((await validator.ValidateAsync(command)).IsValid);
    }

    [Fact]
    public async System.Threading.Tasks.Task UpdateValidator_RejectsStartDateAfterDeadline()
    {
        var command = new UpdateTaskCommand(1, null, null, null, null, "2026-09-01", "2026-09-10", null, null, null);
        var validator = new UpdateTaskCommandValidator(TaskRepoReturning(null).Object, ProjectRepoReturning(null).Object);
        var result = await validator.ValidateAsync(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.ErrorMessage.Contains("Start date must be on or before the deadline"));
    }

    [Fact]
    public async System.Threading.Tasks.Task UpdateValidator_AcceptsOnlyOneDatePresent()
    {
        var onlyDeadline = new UpdateTaskCommand(1, null, null, null, null, "2026-09-10", null, null, null, null);
        var onlyStart = new UpdateTaskCommand(1, null, null, null, null, null, "2026-09-01", null, null, null);
        var validator = new UpdateTaskCommandValidator(TaskRepoReturning(null).Object, ProjectRepoReturning(null).Object);

        Assert.True((await validator.ValidateAsync(onlyDeadline)).IsValid);
        Assert.True((await validator.ValidateAsync(onlyStart)).IsValid);
    }

    [Fact]
    public async System.Threading.Tasks.Task UpdateValidator_RejectsTaskDeadlineAfterProjectDeadline()
    {
        var task = TaskEntity.Create(projectId: 7, title: "Task", description: null);
        var project = Project.Create("Project", null, createdBy: 1, deadline: new DateOnly(2026, 9, 5));
        var command = new UpdateTaskCommand(1, null, null, null, null, "2026-09-10", null, null, null, null);
        var validator = new UpdateTaskCommandValidator(TaskRepoReturning(task).Object, ProjectRepoReturning(project).Object);
        var result = await validator.ValidateAsync(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.ErrorMessage.Contains("project's deadline"));
    }

    [Fact]
    public async System.Threading.Tasks.Task UpdateValidator_AcceptsTaskDeadlineOnOrBeforeProjectDeadline()
    {
        var task = TaskEntity.Create(projectId: 7, title: "Task", description: null);
        var project = Project.Create("Project", null, createdBy: 1, deadline: new DateOnly(2026, 9, 10));
        var command = new UpdateTaskCommand(1, null, null, null, null, "2026-09-10", null, null, null, null);
        var validator = new UpdateTaskCommandValidator(TaskRepoReturning(task).Object, ProjectRepoReturning(project).Object);

        Assert.True((await validator.ValidateAsync(command)).IsValid);
    }

    [Fact]
    public async System.Threading.Tasks.Task UpdateValidator_RejectsNewStartDateAfterPersistedDeadline()
    {
        var task = TaskEntity.Create(projectId: 7, title: "Task", description: null, deadline: new DateOnly(2026, 9, 5));
        // Payload moves only the start date; the deadline stays on its persisted value.
        var command = new UpdateTaskCommand(1, null, null, null, null, null, "2026-09-20", null, null, null);
        var validator = new UpdateTaskCommandValidator(TaskRepoReturning(task).Object, ProjectRepoReturning(null).Object);
        var result = await validator.ValidateAsync(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.ErrorMessage.Contains("Start date must be on or before the deadline"));
    }

    [Fact]
    public async System.Threading.Tasks.Task UpdateValidator_RejectsNewStartDateAfterProjectDeadline()
    {
        var task = TaskEntity.Create(projectId: 7, title: "Task", description: null);
        var project = Project.Create("Project", null, createdBy: 1, deadline: new DateOnly(2026, 9, 5));
        var command = new UpdateTaskCommand(1, null, null, null, null, null, "2026-09-20", null, null, null);
        var validator = new UpdateTaskCommandValidator(TaskRepoReturning(task).Object, ProjectRepoReturning(project).Object);
        var result = await validator.ValidateAsync(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.ErrorMessage.Contains("start date cannot be later than the project's deadline"));
    }

    [Fact]
    public async System.Threading.Tasks.Task UpdateValidator_AcceptsPartialUpdateThatLeavesDatesAlone()
    {
        var task = TaskEntity.Create(projectId: 7, title: "Task", description: null, deadline: new DateOnly(2026, 9, 5));
        var project = Project.Create("Project", null, createdBy: 1, deadline: new DateOnly(2026, 9, 1));
        var command = new UpdateTaskCommand(1, "Renamed", null, null, null, null, null, null, null, null);
        var validator = new UpdateTaskCommandValidator(TaskRepoReturning(task).Object, ProjectRepoReturning(project).Object);

        Assert.True((await validator.ValidateAsync(command)).IsValid);
    }
}
