using Moq;
using TaskGenie.Application.Features.AI.Commands;
using TaskGenie.Application.Features.AI.Services;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskEntity = TaskGenie.Domain.Entities.Task;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Tests.Application;

public sealed class AnalyzeTaskRiskCommandHandlerTests
{
    [Fact]
    public async Task Handle_ProviderFailure_PersistsExplainableFallbackAndUpdatesTask()
    {
        var task = TaskEntity.Create(7, "Critical integration", "Integrate core API", deadline: DateOnly.FromDateTime(DateTime.UtcNow).AddDays(1));
        task.TaskId = 42;
        task.Update(null, null, "InProgress", null, null, 40, 4, null);

        var taskRepo = new Mock<ITaskRepository>();
        taskRepo.Setup(repo => repo.GetByIdAsync(42, It.IsAny<CancellationToken>())).ReturnsAsync(task);
        taskRepo.Setup(repo => repo.GetTaskAssigneesAsync(42, It.IsAny<CancellationToken>())).ReturnsAsync(new List<TaskAssignee>());
        var logRepo = new Mock<ITaskLogRepository>();
        logRepo.Setup(repo => repo.GetByTaskIdAsync(42, It.IsAny<CancellationToken>())).ReturnsAsync(new List<TaskLog>());
        var dependencyRepo = new Mock<ITaskDependencyRepository>();
        dependencyRepo.Setup(repo => repo.GetByTaskIdWithDetailsAsync(42, It.IsAny<CancellationToken>())).ReturnsAsync(new List<TaskDependency>());
        var userRepo = new Mock<IUserRepository>();
        var riskRepo = new Mock<IRiskRepository>();
        riskRepo.Setup(repo => repo.GetActiveRulesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new List<RiskRule>());
        RiskScoreHistory? savedHistory = null;
        AiExecutionLog? savedLog = null;
        riskRepo.Setup(repo => repo.AddAssessmentAsync(It.IsAny<RiskScoreHistory>(), It.IsAny<AiExecutionLog>(), It.IsAny<CancellationToken>()))
            .Callback<RiskScoreHistory, AiExecutionLog, CancellationToken>((history, log, _) =>
            {
                savedHistory = history;
                savedLog = log;
            })
            .Returns(System.Threading.Tasks.Task.CompletedTask);
        var textService = new Mock<ITextGenerationService>();
        textService.Setup(service => service.GenerateTextAsync(It.IsAny<string>(), It.IsAny<int>()))
            .ThrowsAsync(new HttpRequestException("provider unavailable"));
        var authz = new Mock<IResourceAuthorizationService>();
        authz.Setup(a => a.EnsureCanManageTaskAsync(42, It.IsAny<CancellationToken>())).ReturnsAsync(task);

        var handler = new AnalyzeTaskRiskCommandHandler(
            authz.Object,
            taskRepo.Object,
            logRepo.Object,
            dependencyRepo.Object,
            userRepo.Object,
            riskRepo.Object,
            new RiskScoringEngine(),
            textService.Object);

        var result = await handler.Handle(new AnalyzeTaskRiskCommand(42), CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("RULES_ONLY_FALLBACK", result.CalculationMode);
        Assert.Equal(5, result.Factors.Count);
        Assert.Equal(result.RiskLevel, task.RiskLevel);
        Assert.NotNull(savedHistory);
        Assert.Equal(5, savedHistory!.Factors.Count);
        Assert.NotNull(savedLog);
        Assert.Equal("FALLBACK", savedLog!.Status);
        Assert.Contains("provider unavailable", savedLog.ErrorMessage);
        taskRepo.Verify(repo => repo.UpdateAsync(task, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_UnknownTask_ThrowsNotFoundWithoutCallingAi()
    {
        var taskRepo = new Mock<ITaskRepository>();
        var textService = new Mock<ITextGenerationService>();
        var authz = new Mock<IResourceAuthorizationService>();
        authz.Setup(a => a.EnsureCanManageTaskAsync(404, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new TaskGenie.Application.Common.Exceptions.NotFoundException("Task", 404));
        var handler = new AnalyzeTaskRiskCommandHandler(
            authz.Object,
            taskRepo.Object,
            Mock.Of<ITaskLogRepository>(),
            Mock.Of<ITaskDependencyRepository>(),
            Mock.Of<IUserRepository>(),
            Mock.Of<IRiskRepository>(),
            new RiskScoringEngine(),
            textService.Object);

        await Assert.ThrowsAsync<TaskGenie.Application.Common.Exceptions.NotFoundException>(
            () => handler.Handle(new AnalyzeTaskRiskCommand(404), CancellationToken.None));

        textService.Verify(service => service.GenerateTextAsync(It.IsAny<string>(), It.IsAny<int>()), Times.Never);
    }
}
