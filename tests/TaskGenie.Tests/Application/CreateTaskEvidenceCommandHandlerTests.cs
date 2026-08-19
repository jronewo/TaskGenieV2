using Moq;
using TaskGenie.Application.Features.Evidence;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskEntity = TaskGenie.Domain.Entities.Task;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Tests.Application;

public sealed class CreateTaskEvidenceCommandHandlerTests
{
    private static (Mock<ICurrentUser> CurrentUser, Mock<IResourceAuthorizationService> Authz) SetupActor(TaskEntity task, int taskId)
    {
        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.UserId).Returns(9);
        var authz = new Mock<IResourceAuthorizationService>();
        authz.Setup(a => a.EnsureCanManageTaskAsync(taskId, It.IsAny<CancellationToken>())).ReturnsAsync(task);
        return (currentUser, authz);
    }

    [Fact]
    public async Task Handle_ValidUrlEvidence_PersistsAndReturnsDto()
    {
        var task = TaskEntity.Create(1, "Task", null);
        task.TaskId = 2;
        var (currentUser, authz) = SetupActor(task, 2);
        var evidenceRepo = new Mock<IEvidenceRepository>();
        TaskEvidence? saved = null;
        evidenceRepo.Setup(repo => repo.AddEvidenceAsync(It.IsAny<TaskEvidence>(), It.IsAny<CancellationToken>()))
            .Callback<TaskEvidence, CancellationToken>((evidence, _) => saved = evidence)
            .ReturnsAsync((TaskEvidence evidence, CancellationToken _) => evidence);
        evidenceRepo.Setup(repo => repo.GetByTaskIdAsync(2, It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => new List<TaskEvidence> { saved! });
        var handler = new CreateTaskEvidenceCommandHandler(
            currentUser.Object, authz.Object, Mock.Of<ITaskLogRepository>(), evidenceRepo.Object);

        var result = await handler.Handle(new CreateTaskEvidenceCommand(
            2, "URL", "Build evidence", null, "https://ci.example.com/build/123",
            null, null, null, null, null), CancellationToken.None);

        Assert.Equal("URL", result.EvidenceType);
        Assert.Equal("https://ci.example.com/build/123", result.ExternalUrl);
        evidenceRepo.Verify(repo => repo.AddEvidenceAsync(It.IsAny<TaskEvidence>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_OversizedAttachment_IsRejected()
    {
        var task = TaskEntity.Create(1, "Task", null);
        task.TaskId = 2;
        var (currentUser, authz) = SetupActor(task, 2);
        var evidenceRepo = new Mock<IEvidenceRepository>();
        var handler = new CreateTaskEvidenceCommandHandler(
            currentUser.Object, authz.Object, Mock.Of<ITaskLogRepository>(), evidenceRepo.Object);

        await Assert.ThrowsAsync<ArgumentException>(() => handler.Handle(new CreateTaskEvidenceCommand(
            2, "FILE", null, null, null, "huge.pdf", "application/pdf",
            26L * 1024 * 1024, "https://cdn.example.com/huge.pdf", null), CancellationToken.None));
        evidenceRepo.Verify(repo => repo.AddAttachmentAsync(It.IsAny<Attachment>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_DisallowedMimeType_IsRejected()
    {
        var task = TaskEntity.Create(1, "Task", null);
        task.TaskId = 2;
        var (currentUser, authz) = SetupActor(task, 2);
        var handler = new CreateTaskEvidenceCommandHandler(
            currentUser.Object, authz.Object, Mock.Of<ITaskLogRepository>(), Mock.Of<IEvidenceRepository>());

        await Assert.ThrowsAsync<ArgumentException>(() => handler.Handle(new CreateTaskEvidenceCommand(
            2, "FILE", null, null, null, "malware.exe", "application/x-msdownload",
            500, "https://cdn.example.com/malware.exe", null), CancellationToken.None));
    }
}
