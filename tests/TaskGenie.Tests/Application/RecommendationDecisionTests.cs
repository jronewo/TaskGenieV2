using MediatR;
using Moq;
using TaskGenie.Application.Features.AI.Commands;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskEntity = TaskGenie.Domain.Entities.Task;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Tests.Application;

public sealed class RecommendationDecisionTests
{
    [Fact]
    public async Task Accept_AlreadyAssigned_DoesNotToggleAssignmentOff()
    {
        var task = TaskEntity.Create(1, "Task", null);
        task.TaskId = 5;
        var recommendation = AiRecommendation.Create(5, 10, 90, "Best", rank: 1);
        var taskRepo = new Mock<ITaskRepository>();
        taskRepo.Setup(repo => repo.GetByIdAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(task);
        taskRepo.Setup(repo => repo.GetTaskAssigneesAsync(5, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<TaskAssignee> { TaskAssignee.Create(5, 10) });
        var recommendationRepo = new Mock<IAiRecommendationRepository>();
        recommendationRepo.Setup(repo => repo.GetLatestRunByTaskIdAsync(5, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<AiRecommendation> { recommendation });
        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.UserId).Returns(1);
        var authz = new Mock<IResourceAuthorizationService>();
        authz.Setup(a => a.EnsureCanManageTaskAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(task);
        var handler = new AcceptAssignmentRecommendationCommandHandler(
            currentUser.Object, authz.Object, taskRepo.Object, recommendationRepo.Object, Mock.Of<IMediator>());

        var result = await handler.Handle(new AcceptAssignmentRecommendationCommand(5, 10), CancellationToken.None);

        Assert.True(result);
        taskRepo.Verify(repo => repo.ClearTaskAssigneesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
        taskRepo.Verify(repo => repo.AddTaskAssigneeAsync(It.IsAny<TaskAssignee>(), It.IsAny<CancellationToken>()), Times.Never);
        recommendationRepo.Verify(repo => repo.RecordDecisionAsync(5, 10, true, 1, null, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Accept_UserOutsideLatestRun_IsRejectedBeforeChangingAssignment()
    {
        var task = TaskEntity.Create(1, "Task", null);
        var taskRepo = new Mock<ITaskRepository>();
        taskRepo.Setup(repo => repo.GetByIdAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(task);
        taskRepo.Setup(repo => repo.GetTaskAssigneesAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(new List<TaskAssignee>());
        var recommendationRepo = new Mock<IAiRecommendationRepository>();
        recommendationRepo.Setup(repo => repo.GetLatestRunByTaskIdAsync(5, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<AiRecommendation> { AiRecommendation.Create(5, 10, 90, "Best") });
        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.UserId).Returns(1);
        var authz = new Mock<IResourceAuthorizationService>();
        authz.Setup(a => a.EnsureCanManageTaskAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(task);
        var handler = new AcceptAssignmentRecommendationCommandHandler(
            currentUser.Object, authz.Object, taskRepo.Object, recommendationRepo.Object, Mock.Of<IMediator>());

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            handler.Handle(new AcceptAssignmentRecommendationCommand(5, 999), CancellationToken.None));

        taskRepo.Verify(repo => repo.ClearTaskAssigneesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
