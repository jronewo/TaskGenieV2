using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using TaskGenie.Application.Features.AI.DTOs;
using TaskGenie.Application.Features.Evidence;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Infrastructure.Persistence;
using TaskEntity = TaskGenie.Domain.Entities.Task;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Tests.Integration;

public sealed class AiCoreApiIntegrationTests
{
    [Fact]
    public async Task RiskEndpoint_ReturnsAssessmentAndPersistsHistory()
    {
        await using var factory = new AiCoreApiFactory();
        using var client = factory.CreateClient();
        var taskId = await factory.SeedTaskAsync(projectId: 1);
        await factory.AuthenticateAsync(client);

        var response = await client.PostAsync($"/api/ai-analysis/{taskId}/risk", null);
        var payload = await response.Content.ReadFromJsonAsync<RiskAssessmentDto>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(payload);
        Assert.Equal(5, payload!.Factors.Count);
        await factory.WithDbAsync(context =>
        {
            Assert.Single(context.RiskScoreHistories);
            Assert.Equal(5, context.RiskFactors.Count());
        });
    }

    [Fact]
    public async Task RecommendationEndpoint_ReturnsRankedCandidatesAndAuditLog()
    {
        await using var factory = new AiCoreApiFactory();
        using var client = factory.CreateClient();
        var taskId = await factory.SeedTaskAsync(projectId: 2, userCount: 3);
        await factory.AuthenticateAsync(client);

        var response = await client.PostAsJsonAsync("/api/task-assignment/recommend", new { taskId, projectId = 2 });
        var payload = await response.Content.ReadFromJsonAsync<TaskAssignmentResponseDto>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(payload);
        Assert.Equal(3, payload!.Suggestions.Count);
        Assert.Equal(new[] { 1, 2, 3 }, payload.Suggestions.Select(item => item.Rank));
        await factory.WithDbAsync(context =>
        {
            Assert.Equal(3, context.AiRecommendations.Count());
            Assert.Single(context.AiExecutionLogs);
        });
    }

    [Fact]
    public async Task EvidenceEndpoint_ValidatesAndReturnsCreatedUrlEvidence()
    {
        await using var factory = new AiCoreApiFactory();
        using var client = factory.CreateClient();
        var taskId = await factory.SeedTaskAsync(projectId: 3);
        await factory.AuthenticateAsync(client);

        var response = await client.PostAsJsonAsync($"/api/tasks/{taskId}/evidence", new
        {
            evidenceType = "URL",
            description = "HTTP integration evidence",
            externalUrl = "https://ci.example.com/run/http-1"
        });
        var payload = await response.Content.ReadFromJsonAsync<EvidenceDto>();

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("https://ci.example.com/run/http-1", payload!.ExternalUrl);
        var list = await client.GetFromJsonAsync<List<EvidenceDto>>($"/api/tasks/{taskId}/evidence");
        Assert.Single(list!);
    }
}

public sealed class AiCoreApiFactory : WebApplicationFactory<Program>
{
    private const string TestJwtSecret = "taskgenie-integration-test-secret-at-least-32-characters";
    private readonly string _databaseName = $"taskgenie-api-{Guid.NewGuid()}";

    public AiCoreApiFactory()
    {
        // Minimal-host startup reads environment variables before ConfigureWebHost runs.
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
            services.RemoveAll<ITextGenerationService>();
            services.AddSingleton<ITextGenerationService, SuccessfulTextGenerationService>();
            services.RemoveAll<IHuggingFaceService>();
            services.AddSingleton<IHuggingFaceService, SuccessfulSemanticService>();
        });
    }

    public async Task<int> SeedTaskAsync(int projectId, int userCount = 1)
    {
        _ = Services;
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();
        if (!context.Users.Any())
        {
            for (var index = 1; index <= userCount; index++)
                context.Users.Add(User.Create($"User {index}", $"user{index}@api.test", "hash"));
        }
        var task = TaskEntity.Create(
            projectId,
            "API integration task",
            "Exercise the real HTTP pipeline",
            deadline: DateOnly.FromDateTime(DateTime.UtcNow).AddDays(3));
        context.Tasks.Add(task);
        await context.SaveChangesAsync();
        return task.TaskId;
    }

    public async Task AuthenticateAsync(HttpClient client, int userId = 1)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await context.Users.SingleAsync(item => item.UserId == userId);
        var tokenService = scope.ServiceProvider.GetRequiredService<IJwtTokenService>();
        var token = tokenService.GenerateToken(user.UserId, user.Email, user.Role ?? "NORMAL_USER");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token.AccessToken);
    }

    public async Task WithDbAsync(Action<AppDbContext> assertion)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        assertion(context);
        await Task.CompletedTask;
    }

    private sealed class SuccessfulTextGenerationService : ITextGenerationService
    {
        public Task<string> GenerateTextAsync(string prompt, int maxTokens = 200) =>
            Task.FromResult("The deterministic factors indicate a measurable delivery risk.");

        public Task<string> GenerateAssignmentReasonAsync(string taskDescription, string userProfile) =>
            Task.FromResult("Profile matches the task.");
    }

    private sealed class SuccessfulSemanticService : IHuggingFaceService
    {
        public Task<List<float[]>> GetEmbeddingsAsync(List<string> texts) =>
            Task.FromResult(texts.Select(_ => Array.Empty<float>()).ToList());

        public Task<double> ComputeSimilarityAsync(string text1, string text2) => Task.FromResult(0.8);

        public Task<List<double>> ComputeSimilarityBatchAsync(string sourceText, List<string> targetTexts) =>
            Task.FromResult(targetTexts.Select((_, index) => 0.9 - index * 0.1).ToList());
    }
}
