using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using TaskGenie.Application.Features.Evidence;
using TaskGenie.Application.Features.TaskComments;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;
using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Tests.Integration;

/// <summary>
/// Covers resource authorization + no-actor-impersonation for AI analysis, task evidence,
/// task comments, and task assignment recommendations.
/// </summary>
public sealed class AiEvidenceCommentsAssignmentAuthorizationApiTests
{
    // ── AI analysis ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Risk_Outsider_ReturnsForbidden()
    {
        await using var factory = new Factory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var (_, taskId) = await factory.SeedProjectWithTaskAsync(owner);
        await factory.AuthenticateAsync(client, outsider);

        var response = await client.PostAsync($"/api/ai-analysis/{taskId}/risk", null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Risk_PlainMember_ReturnsForbidden_LeaderSucceeds()
    {
        await using var factory = new Factory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var leader = await factory.SeedUserAsync();
        var (_, taskId) = await factory.SeedProjectWithTaskAsync(
            owner, extraMemberUserIds: [member, leader], extraMemberRoles: ["MEMBER", "LEADER"]);

        await factory.AuthenticateAsync(client, member);
        var memberResponse = await client.PostAsync($"/api/ai-analysis/{taskId}/risk", null);
        Assert.Equal(HttpStatusCode.Forbidden, memberResponse.StatusCode);

        await factory.AuthenticateAsync(client, leader);
        var leaderResponse = await client.PostAsync($"/api/ai-analysis/{taskId}/risk", null);
        Assert.Equal(HttpStatusCode.OK, leaderResponse.StatusCode);
    }

    [Fact]
    public async Task RiskHistory_Read_PlainMember_ReturnsOk()
    {
        await using var factory = new Factory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var (_, taskId) = await factory.SeedProjectWithTaskAsync(owner, extraMemberUserIds: [member]);
        await factory.AuthenticateAsync(client, member);

        var response = await client.GetAsync($"/api/ai-analysis/{taskId}/risk-history");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task RiskHistory_NonExistentTask_ReturnsNotFound()
    {
        await using var factory = new Factory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user);

        var response = await client.GetAsync("/api/ai-analysis/999999/risk-history");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── Evidence ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Evidence_Create_PlainMember_ReturnsForbidden_LeaderSucceedsWithJwtActor()
    {
        await using var factory = new Factory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var leader = await factory.SeedUserAsync();
        var (_, taskId) = await factory.SeedProjectWithTaskAsync(
            owner, extraMemberUserIds: [member, leader], extraMemberRoles: ["MEMBER", "LEADER"]);

        await factory.AuthenticateAsync(client, member);
        var memberResponse = await client.PostAsJsonAsync($"/api/tasks/{taskId}/evidence", new
        {
            evidenceType = "URL",
            externalUrl = "https://ci.example.com/member-attempt"
        });
        Assert.Equal(HttpStatusCode.Forbidden, memberResponse.StatusCode);

        await factory.AuthenticateAsync(client, leader);
        var leaderResponse = await client.PostAsJsonAsync($"/api/tasks/{taskId}/evidence", new
        {
            evidenceType = "URL",
            externalUrl = "https://ci.example.com/leader-attempt"
        });
        Assert.Equal(HttpStatusCode.Created, leaderResponse.StatusCode);
        await factory.WithDbAsync(context =>
        {
            var evidence = context.Set<TaskEvidence>().Single(e => e.TaskId == taskId);
            Assert.Equal(leader, evidence.SubmittedBy);
        });
    }

    [Fact]
    public async Task Evidence_Get_Outsider_ReturnsForbidden()
    {
        await using var factory = new Factory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var (_, taskId) = await factory.SeedProjectWithTaskAsync(owner);
        await factory.AuthenticateAsync(client, outsider);

        var response = await client.GetAsync($"/api/tasks/{taskId}/evidence");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ── Comments ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Comments_Create_PlainMember_Succeeds_ActorFromJwtNotBody()
    {
        await using var factory = new Factory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var impersonated = await factory.SeedUserAsync();
        var (_, taskId) = await factory.SeedProjectWithTaskAsync(owner, extraMemberUserIds: [member]);
        await factory.AuthenticateAsync(client, member);

        var response = await client.PostAsJsonAsync("/api/taskcomments", new
        {
            taskId,
            content = "Working on it",
            imageUrl = (string?)null,
            userId = impersonated
        });
        var payload = await response.Content.ReadFromJsonAsync<TaskCommentDto>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(member, payload!.UserId);
        Assert.NotEqual(impersonated, payload.UserId);
    }

    [Fact]
    public async Task Comments_Create_Outsider_ReturnsForbidden()
    {
        await using var factory = new Factory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var (_, taskId) = await factory.SeedProjectWithTaskAsync(owner);
        await factory.AuthenticateAsync(client, outsider);

        var response = await client.PostAsJsonAsync("/api/taskcomments", new
        {
            taskId,
            content = "Sneaking in",
            imageUrl = (string?)null
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Comments_Delete_Author_Succeeds()
    {
        await using var factory = new Factory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var (_, taskId) = await factory.SeedProjectWithTaskAsync(owner, extraMemberUserIds: [member]);
        var commentId = await factory.SeedCommentAsync(taskId, member);
        await factory.AuthenticateAsync(client, member);

        var response = await client.DeleteAsync($"/api/taskcomments/{commentId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Comments_Delete_OtherPlainMember_ReturnsForbidden()
    {
        await using var factory = new Factory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var author = await factory.SeedUserAsync();
        var otherMember = await factory.SeedUserAsync();
        var (_, taskId) = await factory.SeedProjectWithTaskAsync(owner, extraMemberUserIds: [author, otherMember]);
        var commentId = await factory.SeedCommentAsync(taskId, author);
        await factory.AuthenticateAsync(client, otherMember);

        var response = await client.DeleteAsync($"/api/taskcomments/{commentId}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Comments_Delete_TeamLeaderNotAuthor_Succeeds()
    {
        await using var factory = new Factory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var author = await factory.SeedUserAsync();
        var leader = await factory.SeedUserAsync();
        var (_, taskId) = await factory.SeedProjectWithTaskAsync(
            owner, extraMemberUserIds: [author, leader], extraMemberRoles: ["MEMBER", "LEADER"]);
        var commentId = await factory.SeedCommentAsync(taskId, author);
        await factory.AuthenticateAsync(client, leader);

        var response = await client.DeleteAsync($"/api/taskcomments/{commentId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    // ── Assignment ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Recommend_Outsider_ReturnsForbidden()
    {
        await using var factory = new Factory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var (projectId, taskId) = await factory.SeedProjectWithTaskAsync(owner);
        await factory.AuthenticateAsync(client, outsider);

        var response = await client.PostAsJsonAsync("/api/task-assignment/recommend", new { taskId, projectId });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task RecommendationHistory_Outsider_ReturnsForbidden()
    {
        await using var factory = new Factory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var (_, taskId) = await factory.SeedProjectWithTaskAsync(owner);
        await factory.AuthenticateAsync(client, outsider);

        var response = await client.GetAsync($"/api/task-assignment/task/{taskId}/history");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}

public sealed class Factory : WebApplicationFactory<Program>
{
    private const string TestJwtSecret = "taskgenie-ai-evidence-comments-test-secret-32c";
    private readonly string _databaseName = $"taskgenie-ai-evidence-comments-{Guid.NewGuid()}";

    public Factory()
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

            // Never let these tests reach the real AI providers over the network.
            services.RemoveAll<ITextGenerationService>();
            services.AddSingleton<ITextGenerationService, FakeTextGenerationService>();
            services.RemoveAll<IHuggingFaceService>();
            services.AddSingleton<IHuggingFaceService, FakeSemanticService>();
        });
    }

    public async Task<int> SeedUserAsync()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();
        var user = User.Create($"User {Guid.NewGuid():N}", $"user-{Guid.NewGuid():N}@aiflows.test", "hash");
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user.UserId;
    }

    public async Task<(int ProjectId, int TaskId)> SeedProjectWithTaskAsync(
        int owner, int[]? extraMemberUserIds = null, string[]? extraMemberRoles = null)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var team = Team.Create($"Team {Guid.NewGuid():N}", null, owner);
        context.Teams.Add(team);
        await context.SaveChangesAsync();

        context.TeamMembers.Add(TeamMember.Create(team.TeamId, owner, "LEADER"));
        var members = extraMemberUserIds ?? [];
        for (var i = 0; i < members.Length; i++)
        {
            var role = extraMemberRoles is { Length: > 0 } ? extraMemberRoles[i] : "MEMBER";
            context.TeamMembers.Add(TeamMember.Create(team.TeamId, members[i], role));
        }
        await context.SaveChangesAsync();

        var project = Project.Create($"Project {Guid.NewGuid():N}", null, owner);
        project.SetTeamId(team.TeamId);
        context.Projects.Add(project);
        await context.SaveChangesAsync();

        var task = TaskEntity.Create(project.ProjectId, $"Task {Guid.NewGuid():N}", null);
        context.Tasks.Add(task);
        await context.SaveChangesAsync();

        return (project.ProjectId, task.TaskId);
    }

    public async Task<int> SeedCommentAsync(int taskId, int authorUserId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var comment = TaskComment.Create(taskId, authorUserId, "Seeded comment", null);
        context.Set<TaskComment>().Add(comment);
        await context.SaveChangesAsync();
        return comment.CommentId;
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

    private sealed class FakeTextGenerationService : ITextGenerationService
    {
        public Task<string> GenerateTextAsync(string prompt, int maxTokens = 200) =>
            Task.FromResult("Deterministic fake explanation for tests.");

        public Task<string> GenerateAssignmentReasonAsync(string taskDescription, string userProfile) =>
            Task.FromResult("Fake profile match reason.");
    }

    private sealed class FakeSemanticService : IHuggingFaceService
    {
        public Task<List<float[]>> GetEmbeddingsAsync(List<string> texts) =>
            Task.FromResult(texts.Select(_ => Array.Empty<float>()).ToList());

        public Task<double> ComputeSimilarityAsync(string text1, string text2) => Task.FromResult(0.8);

        public Task<List<double>> ComputeSimilarityBatchAsync(string sourceText, List<string> targetTexts) =>
            Task.FromResult(targetTexts.Select((_, index) => 0.9 - index * 0.1).ToList());
    }
}
