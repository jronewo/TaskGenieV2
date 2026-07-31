using Microsoft.EntityFrameworkCore;
using Moq;
using TaskGenie.Application.Features.AI.Commands;
using TaskGenie.Application.Features.AI.Services;
using TaskGenie.Application.Features.Evidence;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;
using TaskGenie.Infrastructure.Persistence.Repositories;
using TaskEntity = TaskGenie.Domain.Entities.Task;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Tests.Integration;

public sealed class AiCorePersistenceIntegrationTests
{
    [Fact]
    public async Task RiskAnalysis_PersistsHistoryFactorsLogAndTaskLevel()
    {
        await using var context = CreateContext();
        var taskRepo = new TaskRepository(context);
        var task = await taskRepo.AddAsync(TaskEntity.Create(
            1, "Risk integration", "Persistence flow", deadline: DateOnly.FromDateTime(DateTime.UtcNow).AddDays(1)));
        task.Update(null, null, "InProgress", null, null, 40, 2, null);
        await taskRepo.UpdateAsync(task);
        var textService = new Mock<ITextGenerationService>();
        textService.Setup(service => service.GenerateTextAsync(It.IsAny<string>(), It.IsAny<int>()))
            .ThrowsAsync(new HttpRequestException("offline"));
        var handler = new AnalyzeTaskRiskCommandHandler(
            taskRepo,
            new TaskLogRepository(context),
            new TaskDependencyRepository(context),
            Mock.Of<IUserRepository>(),
            new RiskRepository(context),
            new RiskScoringEngine(),
            textService.Object);

        var result = await handler.Handle(new AnalyzeTaskRiskCommand(task.TaskId), CancellationToken.None);

        Assert.NotNull(result);
        Assert.Single(context.RiskScoreHistories);
        Assert.Equal(5, context.RiskFactors.Count());
        Assert.Single(context.AiExecutionLogs);
        Assert.Equal(result.RiskLevel, (await context.Tasks.FindAsync(task.TaskId))!.RiskLevel);
    }

    [Fact]
    public async Task UrlEvidence_PersistsAndCanBeQueried()
    {
        await using var context = CreateContext();
        var taskRepo = new TaskRepository(context);
        var task = await taskRepo.AddAsync(TaskEntity.Create(1, "Evidence integration", null));
        var evidenceRepo = new EvidenceRepository(context);
        var handler = new CreateTaskEvidenceCommandHandler(taskRepo, new TaskLogRepository(context), evidenceRepo);

        var created = await handler.Handle(new CreateTaskEvidenceCommand(
            task.TaskId, 7, "URL", "CI proof", null, "https://ci.example.com/run/10",
            null, null, null, null, null), CancellationToken.None);
        var queried = await new GetTaskEvidenceQueryHandler(evidenceRepo)
            .Handle(new GetTaskEvidenceQuery(task.TaskId), CancellationToken.None);

        Assert.Equal("https://ci.example.com/run/10", created.ExternalUrl);
        Assert.Single(queried);
        Assert.Equal(created.EvidenceId, queried[0].EvidenceId);
    }

    [Fact]
    public async Task Recommendation_PersistsRunBreakdownAndExecutionAudit()
    {
        await using var context = CreateContext();
        context.Users.AddRange(
            User.Create("Alice", "alice@integration.test", "hash"),
            User.Create("Bob", "bob@integration.test", "hash"));
        await context.SaveChangesAsync();
        var taskRepo = new TaskRepository(context);
        var task = await taskRepo.AddAsync(TaskEntity.Create(2, "Recommendation integration", "Rank candidates"));
        var semantic = new Mock<IHuggingFaceService>();
        semantic.Setup(service => service.ComputeSimilarityBatchAsync(It.IsAny<string>(), It.IsAny<List<string>>()))
            .ReturnsAsync(new List<double> { 0.7, 0.8 });
        var handler = new GetAssignmentRecommendationsCommandHandler(
            taskRepo,
            new UserRepository(context),
            new TaskRequiredSkillRepository(context),
            new AiRecommendationRepository(context),
            semantic.Object,
            new RiskRepository(context),
            new AssignmentScoringEngine());

        var result = await handler.Handle(
            new GetAssignmentRecommendationsCommand(task.TaskId, 2),
            CancellationToken.None);

        Assert.Equal(2, result.Suggestions.Count);
        Assert.Equal(2, context.AiRecommendations.Count());
        Assert.Single(context.AiExecutionLogs);
        Assert.All(context.AiRecommendations, recommendation => Assert.Equal(result.RunId, recommendation.RunId));
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"taskgenie-integration-{Guid.NewGuid()}")
            .Options;
        var context = new AppDbContext(options);
        context.Database.EnsureCreated();
        return context;
    }
}
