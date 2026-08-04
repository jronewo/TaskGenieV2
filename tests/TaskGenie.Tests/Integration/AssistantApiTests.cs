using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
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
/// The assistant endpoint backing the chat box. It must never widen what its caller can see, and
/// it must still answer when the AI provider is unavailable.
/// </summary>
public sealed class AssistantApiTests
{
    [Fact]
    public async Task Ask_Anonymous_ReturnsUnauthorized()
    {
        await using var factory = new AssistantApiFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/ai-analysis/assistant", new { question = "What is at risk?" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Ask_EmptyQuestion_ReturnsBadRequest()
    {
        await using var factory = new AssistantApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user, "NORMAL_USER");

        var response = await client.PostAsJsonAsync("/api/ai-analysis/assistant", new { question = "  " });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Ask_QuestionOverLimit_ReturnsBadRequest()
    {
        await using var factory = new AssistantApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user, "NORMAL_USER");

        var response = await client.PostAsJsonAsync(
            "/api/ai-analysis/assistant",
            new { question = new string('x', 501) });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Ask_ScopedToAnotherUsersProject_ReturnsForbidden()
    {
        await using var factory = new AssistantApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var projectId = await factory.SeedProjectAsync(owner, "Private roadmap");
        await factory.AuthenticateAsync(client, outsider, "NORMAL_USER");

        var response = await client.PostAsJsonAsync(
            "/api/ai-analysis/assistant",
            new { question = "What is in this project?", projectId });

        // The assistant goes through the same project authorization as any other read.
        Assert.True(
            response.StatusCode is HttpStatusCode.Forbidden or HttpStatusCode.NotFound,
            $"Expected 403/404 but got {(int)response.StatusCode}.");
    }

    /// <summary>
    /// The assistant ships with the paid plans. Hiding the launcher in the UI is presentation only,
    /// so the endpoint itself must refuse a free account.
    /// </summary>
    [Fact]
    public async Task Ask_OnAFreePlan_IsRefusedWithPlanUpgradeRequired()
    {
        await using var factory = new AssistantApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        var projectId = await factory.SeedProjectAsync(user, "Free plan project");
        await factory.AuthenticateAsync(client, user, "NORMAL_USER");

        var response = await client.PostAsJsonAsync(
            "/api/ai-analysis/assistant",
            new { question = "How is this project going?", projectId });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("PLAN_UPGRADE_REQUIRED", body);
    }

    [Fact]
    public async Task Ask_OwnProject_AnswersFromRealRowsWhenProviderIsDown()
    {
        await using var factory = new AssistantApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        await factory.SeedPremiumSubscriptionAsync(owner);
        var projectId = await factory.SeedProjectAsync(owner, "Website Revamp");
        await factory.SeedTaskAsync(projectId, "Fix the login redirect", "Todo");
        await factory.SeedTaskAsync(projectId, "Ship the pricing page", "Done");
        await factory.AuthenticateAsync(client, owner, "NORMAL_USER");

        var response = await client.PostAsJsonAsync(
            "/api/ai-analysis/assistant",
            new { question = "How is this project going?", projectId });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<AssistantResponse>();
        Assert.NotNull(body);
        Assert.False(string.IsNullOrWhiteSpace(body!.Answer));
        // Context reports what the assistant could actually see.
        Assert.Equal(2, body.Context.TaskCount);
        Assert.Equal("Website Revamp", body.Context.ProjectName);
    }

    [Fact]
    public async Task Ask_Unscoped_SeesOnlyTheCallersOwnProjects()
    {
        await using var factory = new AssistantApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        await factory.SeedPremiumSubscriptionAsync(outsider);
        var projectId = await factory.SeedProjectAsync(owner, "Private roadmap");
        await factory.SeedTaskAsync(projectId, "Secret task", "Todo");
        await factory.AuthenticateAsync(client, outsider, "NORMAL_USER");

        var response = await client.PostAsJsonAsync("/api/ai-analysis/assistant", new { question = "What am I working on?" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<AssistantResponse>();
        Assert.NotNull(body);
        // Another user's project and task are invisible here.
        Assert.Equal(0, body!.Context.ProjectCount);
        Assert.Equal(0, body.Context.TaskCount);
        Assert.DoesNotContain("Secret task", body.Answer);
    }

    private sealed record AssistantContextResponse(int ProjectCount, int TaskCount, string? ProjectName);

    private sealed record AssistantResponse(string Answer, AssistantContextResponse Context);
}

public sealed class AssistantApiFactory : WebApplicationFactory<Program>
{
    private const string TestJwtSecret = "taskgenie-assistant-api-test-secret-32chars";
    private readonly string _databaseName = $"taskgenie-assistant-{Guid.NewGuid()}";

    public AssistantApiFactory()
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
        var user = User.Create($"User {Guid.NewGuid():N}", $"user-{Guid.NewGuid():N}@assistant.test", "hash");
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user.UserId;
    }

    /// <summary>
    /// Puts the user on an ACTIVE paid personal plan. The assistant is a paid feature, so every
    /// test that expects an answer rather than a 403 has to grant the entitlement first.
    /// </summary>
    public async Task SeedPremiumSubscriptionAsync(int userId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();

        var plan = Plan.Create(
            $"PRO_PERSONAL_{Guid.NewGuid():N}", "Pro", "PERSONAL", "MONTHLY",
            priceMinor: 99_000, currency: "VND", projectLimit: null, memberLimit: null,
            // The assistant is gated on the plan's own flag, not on the price.
            sortOrder: 0, aiChatbotEnabled: true);
        context.Plans.Add(plan);
        await context.SaveChangesAsync();

        var subscription = Subscription.CreateForUser(plan.PlanId, userId);
        subscription.Activate(DateTime.UtcNow.AddDays(30));
        context.Subscriptions.Add(subscription);
        await context.SaveChangesAsync();
    }

    public async Task<int> SeedProjectAsync(int ownerId, string name)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();
        var project = Project.Create(name, "seeded", ownerId);
        context.Projects.Add(project);
        await context.SaveChangesAsync();
        return project.ProjectId;
    }

    public async Task<int> SeedTaskAsync(int projectId, string title, string status)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var task = TaskEntity.Create(projectId, title, "seeded");
        task.UpdateProgress(status, status == "Done" ? 100 : 0, null, null);
        context.Tasks.Add(task);
        await context.SaveChangesAsync();
        return task.TaskId;
    }

    public async Task AuthenticateAsync(HttpClient client, int userId, string role)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await context.Users.SingleAsync(u => u.UserId == userId);
        var tokenService = scope.ServiceProvider.GetRequiredService<IJwtTokenService>();
        var token = tokenService.GenerateToken(user.UserId, user.Email, role);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token.AccessToken);
    }
}
