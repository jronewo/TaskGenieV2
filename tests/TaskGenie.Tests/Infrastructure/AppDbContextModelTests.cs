using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Infrastructure.Persistence;

namespace TaskGenie.Tests.Infrastructure;

public sealed class AppDbContextModelTests
{
    [Theory]
    [InlineData(typeof(Attachment), "attachments")]
    [InlineData(typeof(TaskEvidence), "task_evidences")]
    [InlineData(typeof(RiskRule), "risk_rules")]
    [InlineData(typeof(RiskFactor), "risk_factors")]
    [InlineData(typeof(RiskScoreHistory), "risk_score_history")]
    [InlineData(typeof(AiExecutionLog), "ai_execution_logs")]
    public void Model_MapsRequiredAiAndEvidenceTables(Type entityType, string expectedTable)
    {
        using var context = CreateContext();

        var metadata = context.Model.FindEntityType(entityType);

        Assert.NotNull(metadata);
        Assert.Equal(expectedTable, metadata!.GetTableName());
    }

    [Fact]
    public void Model_SeedsFiveActiveRiskRules()
    {
        using var context = CreateContext();
        context.Database.EnsureCreated();

        Assert.Equal(5, context.RiskRules.Count());
        Assert.Equal(1, context.RiskRules.Sum(rule => rule.Weight), 8);
        Assert.All(context.RiskRules, rule => Assert.True(rule.IsActive));
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"taskgenie-tests-{Guid.NewGuid()}")
            .Options;
        return new AppDbContext(options);
    }
}
