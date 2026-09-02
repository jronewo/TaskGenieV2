using MediatR;
using Moq;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Events;
using TaskGenie.Application.Features.Tasks.Commands;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskEntity = TaskGenie.Domain.Entities.Task;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Tests.Application;

public sealed class UpdateTaskProgressCommandHandlerTests
{
    private static (UpdateTaskProgressCommandHandler Handler, Mock<ITaskLogRepository> TaskLogRepo, Mock<IMediator> Mediator, Mock<IResourceAuthorizationService> Authz, Mock<ITaskRepository> TaskRepo, TaskEntity Task)
        BuildHandler(string? initialStatus = "InProgress", int? progress = 40, bool isLead = true)
    {
        var task = TaskEntity.Create(7, "Fix broken login redirect", "Users bounce back to sign-in.");
        task.TaskId = 42;
        task.Update(null, null, initialStatus, null, null, null, null, null, null);
        task.UpdateProgress(null, progress, null, null);

        var authz = new Mock<IResourceAuthorizationService>();
        authz.Setup(a => a.EnsureCanUpdateTaskStatusAsync(42, It.IsAny<CancellationToken>())).ReturnsAsync(task);
        if (isLead)
        {
            authz.Setup(a => a.EnsureCanManageTaskAsync(42, It.IsAny<CancellationToken>())).ReturnsAsync(task);
        }
        else
        {
            authz.Setup(a => a.EnsureCanManageTaskAsync(42, It.IsAny<CancellationToken>()))
                .ThrowsAsync(new ForbiddenException("You do not have permission to manage this task."));
        }

        var taskRepo = new Mock<ITaskRepository>();
        var dependencyRepo = new Mock<ITaskDependencyRepository>();
        dependencyRepo.Setup(r => r.GetByTaskIdWithDetailsAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<TaskDependency>());
        var taskLogRepo = new Mock<ITaskLogRepository>();
        var mediator = new Mock<IMediator>();

        var handler = new UpdateTaskProgressCommandHandler(
            authz.Object, taskRepo.Object, dependencyRepo.Object, taskLogRepo.Object, mediator.Object);

        return (handler, taskLogRepo, mediator, authz, taskRepo, task);
    }

    private static TaskDependency BlockerDependency(int taskId, int blockerTaskId, string blockerStatus = "InProgress")
    {
        var blocker = TaskEntity.Create(7, "Blocking task", null);
        blocker.TaskId = blockerTaskId;
        blocker.Update(null, null, blockerStatus, null, null, null, null, null, null);

        var dependency = TaskDependency.Create(taskId, blockerTaskId);
        // DependsOnTask is populated the way GetByTaskIdWithDetailsAsync would return it.
        typeof(TaskDependency).GetProperty(nameof(TaskDependency.DependsOnTask))!.SetValue(dependency, blocker);
        return dependency;
    }

    [Fact]
    public async Task Handle_MoveToBacklog_WritesTaskLogAndPublishesEvent()
    {
        var (handler, taskLogRepo, mediator, _, _, _) = BuildHandler();
        TaskLog? savedLog = null;
        taskLogRepo.Setup(r => r.AddAsync(It.IsAny<TaskLog>(), It.IsAny<CancellationToken>()))
            .Callback<TaskLog, CancellationToken>((log, _) => savedLog = log)
            .Returns(Task.CompletedTask);

        var result = await handler.Handle(
            new UpdateTaskProgressCommand(42, "Backlog", null, null, null, "Login redirect is broken again."),
            CancellationToken.None);

        Assert.True(result);
        Assert.NotNull(savedLog);
        Assert.Equal("Login redirect is broken again.", savedLog!.Note);
        Assert.Null(savedLog.Risk);
        mediator.Verify(
            m => m.Publish(
                It.Is<TaskMovedToBacklogEvent>(e => e.TaskId == 42 && e.Reason == "Login redirect is broken again."),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Handle_MoveToOtherStatus_DoesNotWriteTaskLog()
    {
        var (handler, taskLogRepo, mediator, _, _, _) = BuildHandler(initialStatus: "Todo");

        await handler.Handle(
            new UpdateTaskProgressCommand(42, "InProgress", null, null, null, null),
            CancellationToken.None);

        taskLogRepo.Verify(r => r.AddAsync(It.IsAny<TaskLog>(), It.IsAny<CancellationToken>()), Times.Never);
        mediator.Verify(m => m.Publish(It.IsAny<TaskMovedToBacklogEvent>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_MarkDone_StillEnforcesDependencyGate()
    {
        var (handler, _, _, _, _, task) = BuildHandler(initialStatus: "Backlog", progress: 80);

        var dependencyRepo = new Mock<ITaskDependencyRepository>();
        var dependency = BlockerDependency(42, 99);
        dependencyRepo.Setup(r => r.GetByTaskIdWithDetailsAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<TaskDependency> { dependency });

        var authz = new Mock<IResourceAuthorizationService>();
        authz.Setup(a => a.EnsureCanUpdateTaskStatusAsync(42, It.IsAny<CancellationToken>())).ReturnsAsync(task);
        authz.Setup(a => a.EnsureCanManageTaskAsync(42, It.IsAny<CancellationToken>())).ReturnsAsync(task);

        var handlerWithBlocker = new UpdateTaskProgressCommandHandler(
            authz.Object, Mock.Of<ITaskRepository>(), dependencyRepo.Object, Mock.Of<ITaskLogRepository>(), Mock.Of<IMediator>());

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            handlerWithBlocker.Handle(new UpdateTaskProgressCommand(42, "Done", null, null, null, null), CancellationToken.None));
    }

    [Fact]
    public async Task Handle_MemberMovingToDone_IsForbidden()
    {
        var (handler, _, _, _, _, _) = BuildHandler(initialStatus: "InReview", isLead: false);

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            handler.Handle(new UpdateTaskProgressCommand(42, "Done", null, null, null, null), CancellationToken.None));
    }

    [Fact]
    public async Task Handle_MemberMovingToInReview_NeverChecksManageRights()
    {
        var (handler, _, _, authz, _, _) = BuildHandler(initialStatus: "InProgress", isLead: false);

        var result = await handler.Handle(
            new UpdateTaskProgressCommand(42, "InReview", null, null, null, null),
            CancellationToken.None);

        Assert.True(result);
        authz.Verify(a => a.EnsureCanManageTaskAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_LeadForcesDoneWithSelectedDependency_CompletesBoth()
    {
        var (handler, _, mediator, authz, taskRepo, task) = BuildHandler(initialStatus: "InReview", progress: 90);

        var dependencyRepo = new Mock<ITaskDependencyRepository>();
        var dependency = BlockerDependency(42, 99);
        dependencyRepo.Setup(r => r.GetByTaskIdWithDetailsAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<TaskDependency> { dependency });

        var blockerTask = dependency.DependsOnTask!;
        taskRepo.Setup(r => r.GetByIdAsync(99, It.IsAny<CancellationToken>())).ReturnsAsync(blockerTask);

        var handlerWithBlocker = new UpdateTaskProgressCommandHandler(
            authz.Object, taskRepo.Object, dependencyRepo.Object, Mock.Of<ITaskLogRepository>(), mediator.Object);

        var result = await handlerWithBlocker.Handle(
            new UpdateTaskProgressCommand(42, "Done", null, null, null, null, Force: true, ForceDependencyTaskIds: new[] { 99 }),
            CancellationToken.None);

        Assert.True(result);
        Assert.Equal("Done", blockerTask.Status);
        taskRepo.Verify(r => r.UpdateAsync(blockerTask, It.IsAny<CancellationToken>()), Times.Once);
        mediator.Verify(
            m => m.Publish(It.Is<TaskCompletedEvent>(e => e.TaskId == 99), It.IsAny<CancellationToken>()),
            Times.Once);
        mediator.Verify(
            m => m.Publish(It.Is<TaskCompletedEvent>(e => e.TaskId == 42), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Handle_LeadForcesDoneWithNoSelectedDependencies_LeavesBlockerUntouched()
    {
        var (handler, _, mediator, authz, taskRepo, task) = BuildHandler(initialStatus: "InReview", progress: 90);

        var dependencyRepo = new Mock<ITaskDependencyRepository>();
        var dependency = BlockerDependency(42, 99);
        dependencyRepo.Setup(r => r.GetByTaskIdWithDetailsAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<TaskDependency> { dependency });

        var handlerWithBlocker = new UpdateTaskProgressCommandHandler(
            authz.Object, taskRepo.Object, dependencyRepo.Object, Mock.Of<ITaskLogRepository>(), mediator.Object);

        var result = await handlerWithBlocker.Handle(
            new UpdateTaskProgressCommand(42, "Done", null, null, null, null, Force: true, ForceDependencyTaskIds: Array.Empty<int>()),
            CancellationToken.None);

        Assert.True(result);
        Assert.Equal("Done", task.Status);
        taskRepo.Verify(r => r.GetByIdAsync(99, It.IsAny<CancellationToken>()), Times.Never);
        taskRepo.Verify(r => r.UpdateAsync(It.Is<TaskEntity>(t => t.TaskId == 99), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_LeadWithoutForce_StillGetsDependencyException()
    {
        var (handler, _, _, authz, taskRepo, task) = BuildHandler(initialStatus: "InReview", progress: 90);

        var dependencyRepo = new Mock<ITaskDependencyRepository>();
        var dependency = BlockerDependency(42, 99);
        dependencyRepo.Setup(r => r.GetByTaskIdWithDetailsAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<TaskDependency> { dependency });

        var handlerWithBlocker = new UpdateTaskProgressCommandHandler(
            authz.Object, taskRepo.Object, dependencyRepo.Object, Mock.Of<ITaskLogRepository>(), Mock.Of<IMediator>());

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            handlerWithBlocker.Handle(
                new UpdateTaskProgressCommand(42, "Done", null, null, null, null, Force: false),
                CancellationToken.None));
    }
}
