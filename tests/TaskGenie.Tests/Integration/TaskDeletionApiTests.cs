using System.Net;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;
using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Tests.Integration;

/// <summary>
/// Reproduces the Docker SQL Server UAT defect: DELETE /api/tasks/{id} returned 500 because
/// ai_recommendations.task_id (and other dependent tables with no DB-level cascade) blocked the
/// delete once dependent rows existed. Proves the full dependency graph is cleaned up atomically
/// and no orphans remain, without touching an unrelated task's data.
/// </summary>
public sealed class TaskDeletionApiTests
{
    [Fact]
    public async Task Delete_TaskWithFullDependencyGraph_SucceedsAndLeavesNoOrphans()
    {
        await using var factory = new TaskDeletionApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var commenter = await factory.SeedUserAsync();
        var (_, taskId) = await factory.SeedProjectWithTaskAsync(owner);
        var otherTaskId = await factory.SeedSiblingTaskAsync(taskId);

        await factory.SeedDependentDataAsync(taskId, otherTaskId, owner, commenter);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.DeleteAsync($"/api/tasks/{taskId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            Assert.False(context.Tasks.Any(t => t.TaskId == taskId));
            Assert.False(context.AiRecommendations.Any(r => r.TaskId == taskId));
            Assert.False(context.TaskAssignees.Any(a => a.TaskId == taskId));
            Assert.False(context.TaskComments.Any(c => c.TaskId == taskId));
            Assert.False(context.TaskDependencies.Any(d => d.TaskId == taskId || d.DependsOnTaskId == taskId));
            Assert.False(context.RiskScoreHistories.Any(h => h.TaskId == taskId));
            Assert.False(context.RiskFactors.Any(f => f.RiskScoreHistory!.TaskId == taskId));
            Assert.False(context.AiAnalyses.Any(a => a.TaskId == taskId));
            Assert.False(context.TaskLogs.Any(l => l.TaskId == taskId));
            Assert.False(context.TaskEvidences.Any(e => e.TaskId == taskId));
            Assert.False(context.Set<TaskRequiredSkill>().Any(s => s.TaskId == taskId));
            Assert.False(context.AiExecutionLogs.Any(l => l.TaskId == taskId));

            // The sibling task and its own dependency edge to the deleted task's data must survive.
            Assert.True(context.Tasks.Any(t => t.TaskId == otherTaskId));

            // Reward/penalty history is preserved (not deleted) — only the dangling TaskId reference is cleared.
            var score = context.UserScores.Single(s => s.UserId == owner && s.Reason == "Task deletion regression fixture");
            Assert.Null(score.TaskId);
            Assert.Equal(10, score.Amount);
        });
    }

    [Fact]
    public async Task Delete_TaskWithNoDependents_StillSucceeds()
    {
        await using var factory = new TaskDeletionApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (_, taskId) = await factory.SeedProjectWithTaskAsync(owner);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.DeleteAsync($"/api/tasks/{taskId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Delete_DoesNotAffectSiblingTaskDependentData()
    {
        await using var factory = new TaskDeletionApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (_, taskId) = await factory.SeedProjectWithTaskAsync(owner);
        var otherTaskId = await factory.SeedSiblingTaskAsync(taskId);
        await factory.SeedRecommendationAsync(otherTaskId, owner);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.DeleteAsync($"/api/tasks/{taskId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            Assert.True(context.AiRecommendations.Any(r => r.TaskId == otherTaskId));
        });
    }
}

public sealed class TaskDeletionApiFactory : WebApplicationFactory<Program>
{
    private const string TestJwtSecret = "taskgenie-task-deletion-test-secret-32chars";
    private readonly string _databaseName = $"taskgenie-task-deletion-{Guid.NewGuid()}";

    public TaskDeletionApiFactory()
    {
        Environment.SetEnvironmentVariable("Jwt__Secret", TestJwtSecret);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.RemoveAll<AppDbContext>();
            services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(_databaseName));
        });
    }

    public async Task<int> SeedUserAsync()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();
        var user = User.Create($"User {Guid.NewGuid():N}", $"user-{Guid.NewGuid():N}@taskdel.test", "hash");
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user.UserId;
    }

    public async Task<(int ProjectId, int TaskId)> SeedProjectWithTaskAsync(int owner)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var project = Project.Create($"Project {Guid.NewGuid():N}", null, owner);
        context.Projects.Add(project);
        await context.SaveChangesAsync();

        var task = TaskEntity.Create(project.ProjectId, $"Task {Guid.NewGuid():N}", null);
        context.Tasks.Add(task);
        await context.SaveChangesAsync();

        return (project.ProjectId, task.TaskId);
    }

    public async Task<int> SeedSiblingTaskAsync(int taskId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var task = await context.Tasks.SingleAsync(t => t.TaskId == taskId);
        var sibling = TaskEntity.Create(task.ProjectId!.Value, $"Sibling {Guid.NewGuid():N}", null);
        context.Tasks.Add(sibling);
        await context.SaveChangesAsync();
        return sibling.TaskId;
    }

    public async Task SeedRecommendationAsync(int taskId, int userId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        context.AiRecommendations.Add(AiRecommendation.Create(taskId, userId, 90, "Fixture", rank: 1));
        await context.SaveChangesAsync();
    }

    /// <summary>Seeds one row in every dependent table that previously blocked task deletion
    /// (plus the ones that already cascaded, for completeness), mirroring the fixture that
    /// reproduced the Docker UAT defect.</summary>
    public async Task SeedDependentDataAsync(int taskId, int otherTaskId, int ownerUserId, int commenterUserId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        context.AiRecommendations.Add(AiRecommendation.Create(taskId, commenterUserId, 88, "Fixture", rank: 1));
        context.TaskAssignees.Add(TaskAssignee.Create(taskId, commenterUserId));
        context.TaskComments.Add(TaskComment.Create(taskId, commenterUserId, "Fixture comment", null));
        context.TaskDependencies.Add(TaskDependency.Create(otherTaskId, taskId)); // otherTask depends on taskId
        context.UserScores.Add(UserScore.CreateReward(ownerUserId, 10, "Task deletion regression fixture", taskId: taskId));

        var history = RiskScoreHistory.Create(Guid.NewGuid(), taskId, null, 42.0, "MEDIUM", "risk-v1", "RULES_ONLY", "Fixture explanation", "Fixture mitigation");
        history.AddFactor(RiskFactor.Create(null, "DEADLINE", "raw", 40, 0.3, 12, "evidence"));
        context.RiskScoreHistories.Add(history);

        context.AiAnalyses.Add(AiAnalysis.Create(taskId, "summary", "Fixture analysis"));
        context.TaskLogs.Add(TaskLog.Create(taskId, 50, "Fixture note", null));
        context.TaskEvidences.Add(TaskEvidence.Create(taskId, ownerUserId, "URL", "Fixture evidence", null, null, "https://ci.example.com/fixture"));
        context.AiExecutionLogs.Add(AiExecutionLog.Create(
            Guid.NewGuid(), taskId, "TASK_RISK", "RULE_ENGINE", "risk-v1",
            "{}", "{}", "SUCCEEDED", 10, null));

        var skill = Skill.Create($"Skill {Guid.NewGuid():N}");
        context.Skills.Add(skill);
        await context.SaveChangesAsync();
        context.Set<TaskRequiredSkill>().Add(TaskRequiredSkill.Create(taskId, skill.SkillId, 3));

        await context.SaveChangesAsync();
    }

    public async Task AuthenticateAsync(HttpClient client, int userId, string role = "NORMAL_USER")
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await context.Users.SingleAsync(item => item.UserId == userId);
        var tokenService = scope.ServiceProvider.GetRequiredService<IJwtTokenService>();
        var token = tokenService.GenerateToken(user.UserId, user.Email, role);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token.AccessToken);
    }

    public async Task WithDbAsync(Action<AppDbContext> assertion)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        assertion(context);
        await Task.CompletedTask;
    }
}
