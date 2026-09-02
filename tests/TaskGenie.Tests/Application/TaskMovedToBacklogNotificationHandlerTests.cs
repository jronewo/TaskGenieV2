using MediatR;
using Microsoft.Extensions.Logging;
using Moq;
using TaskGenie.Application.Events;
using TaskGenie.Application.Features.Notifications.Commands;
using TaskGenie.Application.Features.Notifications.EventHandlers;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Tests.Application;

public sealed class TaskMovedToBacklogNotificationHandlerTests
{
    private static Mock<ITaskRepository> TaskRepoWithAssignee(int taskId, int? assigneeUserId)
    {
        var taskRepo = new Mock<ITaskRepository>();
        var assignees = assigneeUserId is null
            ? new List<TaskAssignee>()
            : new List<TaskAssignee> { TaskAssignee.Create(taskId, assigneeUserId.Value) };
        taskRepo.Setup(r => r.GetTaskAssigneesAsync(taskId, It.IsAny<CancellationToken>())).ReturnsAsync(assignees);
        return taskRepo;
    }

    [Fact]
    public async Task Handle_ExistingAssignee_NotifiesThemWithTheReason()
    {
        var taskRepo = TaskRepoWithAssignee(42, assigneeUserId: 9);
        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.UserId).Returns(1); // the mover, not the assignee
        var mediator = new Mock<IMediator>();
        var logger = Mock.Of<ILogger<TaskMovedToBacklogNotificationHandler>>();

        var handler = new TaskMovedToBacklogNotificationHandler(currentUser.Object, taskRepo.Object, mediator.Object, logger);

        await handler.Handle(
            new TaskMovedToBacklogEvent(42, 7, "Fix broken login redirect", "Login redirect is broken again."),
            CancellationToken.None);

        mediator.Verify(
            m => m.Send(
                It.Is<CreateNotificationCommand>(c =>
                    c.UserId == 9 &&
                    c.Type == "TASK_MOVED_TO_BACKLOG" &&
                    c.Message == "Login redirect is broken again." &&
                    c.ReferenceId == 42 &&
                    c.ProjectId == 7),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Handle_MoverIsTheAssignee_DoesNotNotifyThemselves()
    {
        var taskRepo = TaskRepoWithAssignee(42, assigneeUserId: 9);
        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.UserId).Returns(9); // moved their own task back

        var mediator = new Mock<IMediator>();
        var handler = new TaskMovedToBacklogNotificationHandler(
            currentUser.Object, taskRepo.Object, mediator.Object,
            Mock.Of<ILogger<TaskMovedToBacklogNotificationHandler>>());

        await handler.Handle(
            new TaskMovedToBacklogEvent(42, 7, "Fix broken login redirect", "Reason"),
            CancellationToken.None);

        mediator.Verify(m => m.Send(It.IsAny<CreateNotificationCommand>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_NoAssignee_SendsNoNotification()
    {
        var taskRepo = TaskRepoWithAssignee(42, assigneeUserId: null);
        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.UserId).Returns(1);

        var mediator = new Mock<IMediator>();
        var handler = new TaskMovedToBacklogNotificationHandler(
            currentUser.Object, taskRepo.Object, mediator.Object,
            Mock.Of<ILogger<TaskMovedToBacklogNotificationHandler>>());

        await handler.Handle(
            new TaskMovedToBacklogEvent(42, 7, "Fix broken login redirect", "Reason"),
            CancellationToken.None);

        mediator.Verify(m => m.Send(It.IsAny<CreateNotificationCommand>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
