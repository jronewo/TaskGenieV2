using Moq;
using TaskGenie.Application.Features.AI.Commands;
using TaskGenie.Application.Features.AI.Services;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskEntity = TaskGenie.Domain.Entities.Task;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Tests.Application;

public sealed class GetAssignmentRecommendationsCommandHandlerTests
{
    [Fact]
    public async Task Handle_RanksCandidatesPersistsBreakdownAndExecutionLog()
    {
        var task = TaskEntity.Create(20, "Build risk API", "C# risk scoring endpoint");
        task.TaskId = 5;
        task.Update(null, null, null, null, null, 8, null, null);
        var skill = Skill.Create("C#");
        skill.SkillId = 7;
        var required = TaskRequiredSkill.Create(5, 7, 4);
        required.Skill = skill;
        var alice = User.Create("Alice", "alice@example.com", "hash");
        alice.UserId = 10;
        var bob = User.Create("Bob", "bob@example.com", "hash");
        bob.UserId = 11;
        var aliceSkill = UserSkill.Create(10, 7, 5);
        aliceSkill.Skill = skill;
        var bobSkill = UserSkill.Create(11, 7, 2);
        bobSkill.Skill = skill;

        var taskRepo = new Mock<ITaskRepository>();
        taskRepo.Setup(repo => repo.GetByIdAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(task);
        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(repo => repo.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new List<User> { alice, bob });
        userRepo.Setup(repo => repo.GetUserSkillsAsync(10, It.IsAny<CancellationToken>())).ReturnsAsync(new List<UserSkill> { aliceSkill });
        userRepo.Setup(repo => repo.GetUserSkillsAsync(11, It.IsAny<CancellationToken>())).ReturnsAsync(new List<UserSkill> { bobSkill });
        userRepo.Setup(repo => repo.GetUserAvailabilityAsync(It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync(new List<UserAvailability>());
        userRepo.Setup(repo => repo.GetUserEvaluationsAsync(It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync(new List<Evaluation>());
        userRepo.Setup(repo => repo.CountActiveTasksByUserAsync(10, It.IsAny<CancellationToken>())).ReturnsAsync(0);
        userRepo.Setup(repo => repo.CountActiveTasksByUserAsync(11, It.IsAny<CancellationToken>())).ReturnsAsync(4);
        var skillRepo = new Mock<ITaskRequiredSkillRepository>();
        skillRepo.Setup(repo => repo.GetByTaskIdAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(new List<TaskRequiredSkill> { required });
        var recommendationRepo = new Mock<IAiRecommendationRepository>();
        List<AiRecommendation>? persisted = null;
        recommendationRepo.Setup(repo => repo.AddRangeAsync(It.IsAny<List<AiRecommendation>>(), It.IsAny<CancellationToken>()))
            .Callback<List<AiRecommendation>, CancellationToken>((items, _) => persisted = items)
            .Returns(System.Threading.Tasks.Task.CompletedTask);
        var embeddingService = new Mock<IHuggingFaceService>();
        embeddingService.Setup(service => service.ComputeSimilarityBatchAsync(It.IsAny<string>(), It.IsAny<List<string>>()))
            .ReturnsAsync(new List<double> { 0.9, 0.5 });
        var riskRepo = new Mock<IRiskRepository>();
        AiExecutionLog? executionLog = null;
        riskRepo.Setup(repo => repo.AddExecutionLogAsync(It.IsAny<AiExecutionLog>(), It.IsAny<CancellationToken>()))
            .Callback<AiExecutionLog, CancellationToken>((log, _) => executionLog = log)
            .Returns(System.Threading.Tasks.Task.CompletedTask);

        var handler = new GetAssignmentRecommendationsCommandHandler(
            taskRepo.Object,
            userRepo.Object,
            skillRepo.Object,
            recommendationRepo.Object,
            embeddingService.Object,
            riskRepo.Object,
            new AssignmentScoringEngine());

        var result = await handler.Handle(new GetAssignmentRecommendationsCommand(5, 20), CancellationToken.None);

        Assert.Equal("SUCCEEDED", result.ProviderStatus);
        Assert.Equal(2, result.Suggestions.Count);
        Assert.Equal(10, result.Suggestions[0].UserId);
        Assert.Equal(1, result.Suggestions[0].Rank);
        Assert.NotNull(persisted);
        Assert.All(persisted!, recommendation => Assert.Equal(result.RunId, recommendation.RunId));
        Assert.Equal(result.Suggestions[0].SkillMatchScore, persisted![0].SkillMatchScore);
        Assert.NotNull(executionLog);
        Assert.Equal("SUCCEEDED", executionLog!.Status);
    }

    [Fact]
    public async Task Handle_WrongProject_RejectsRequestBeforeScoring()
    {
        var task = TaskEntity.Create(20, "Task", null);
        task.TaskId = 5;
        var taskRepo = new Mock<ITaskRepository>();
        taskRepo.Setup(repo => repo.GetByIdAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(task);
        var embedding = new Mock<IHuggingFaceService>();
        var handler = new GetAssignmentRecommendationsCommandHandler(
            taskRepo.Object,
            Mock.Of<IUserRepository>(),
            Mock.Of<ITaskRequiredSkillRepository>(),
            Mock.Of<IAiRecommendationRepository>(),
            embedding.Object,
            Mock.Of<IRiskRepository>(),
            new AssignmentScoringEngine());

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            handler.Handle(new GetAssignmentRecommendationsCommand(5, 99), CancellationToken.None));
        embedding.Verify(service => service.ComputeSimilarityBatchAsync(It.IsAny<string>(), It.IsAny<List<string>>()), Times.Never);
    }
}
