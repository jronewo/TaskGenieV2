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

namespace TaskGenie.Tests.Integration;

/// <summary>
/// What still bounds an assistant request now that the per-minute throttle is gone. That limit
/// existed to protect an external AI quota; the assistant reads the database directly, so the
/// remaining guard is the prompt length, which keeps one message from carrying a novel. Every test
/// here seeds an active Pro subscription first (`SeedUserAsync`), since the agent is a paid feature
/// and a caller without one is refused before any of these guards are even reached — that refusal
/// has its own test below.
/// </summary>
public sealed class AgentRequestLimitApiTests
{
    [Fact]
    public async Task AUserWithoutAPaidPlan_IsRefusedBeforeReachingTheAgent()
    {
        await using var factory = new AgentRequestLimitApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserWithoutSubscriptionAsync();
        await factory.AuthenticateAsync(client, user);

        var response = await client.PostAsJsonAsync("/api/ai-analysis/agent", new { message = "cho tôi tổng quan" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AnOverlongPrompt_IsRejected()
    {
        await using var factory = new AgentRequestLimitApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user);

        var response = await client.PostAsJsonAsync(
            "/api/ai-analysis/agent",
            new { message = new string('x', 501) });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task SeveralPromptsInARow_AreAllAccepted()
    {
        await using var factory = new AgentRequestLimitApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user);

        // Three questions in a row used to earn a 429 on the second.
        for (var i = 0; i < 3; i++)
        {
            var response = await client.PostAsJsonAsync("/api/ai-analysis/agent", new { message = "cho tôi tổng quan" });
            Assert.NotEqual(HttpStatusCode.TooManyRequests, response.StatusCode);
        }
    }

    [Fact]
    public async Task AnEmptyPrompt_IsRejected()
    {
        await using var factory = new AgentRequestLimitApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user);

        var response = await client.PostAsJsonAsync("/api/ai-analysis/agent", new { message = "   " });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}

public sealed class AgentRequestLimitApiFactory : WebApplicationFactory<Program>
{
    private const string TestJwtSecret = "taskgenie-agent-ratelimit-test-secret32ch";
    private readonly string _databaseName = $"taskgenie-agent-rl-{Guid.NewGuid()}";

    public AgentRequestLimitApiFactory()
    {
        Environment.SetEnvironmentVariable("Jwt__Secret", TestJwtSecret);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Auth throttles stay on here, matching the rest of the rate-limit suite; the assistant
        // itself is no longer throttled.
        builder.UseEnvironment("RateLimitTesting");
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.RemoveAll<AppDbContext>();
            services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(_databaseName));
        });
    }

    public async Task<int> SeedUserWithoutSubscriptionAsync()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();
        var user = User.Create($"User {Guid.NewGuid():N}", $"user-{Guid.NewGuid():N}@agent.test", "hash");
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user.UserId;
    }

    public async Task<int> SeedUserAsync()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();
        var user = User.Create($"User {Guid.NewGuid():N}", $"user-{Guid.NewGuid():N}@agent.test", "hash");
        context.Users.Add(user);
        await context.SaveChangesAsync();

        // The agent is a paid feature (RunAgentQueryHandler gates on AiChatbotEnabled) — every test
        // that expects an answer rather than a 403 needs the entitlement granted first.
        var plan = Plan.Create(
            $"PRO_PERSONAL_{Guid.NewGuid():N}", "Pro", "PERSONAL", "MONTHLY",
            priceMinor: 99_000, currency: "VND", projectLimit: null, memberLimit: null,
            sortOrder: 0, aiChatbotEnabled: true);
        context.Plans.Add(plan);
        await context.SaveChangesAsync();

        var subscription = Subscription.CreateForUser(plan.PlanId, user.UserId);
        subscription.Activate(DateTime.UtcNow.AddDays(30));
        context.Subscriptions.Add(subscription);
        await context.SaveChangesAsync();

        return user.UserId;
    }

    public async Task AuthenticateAsync(HttpClient client, int userId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await context.Users.SingleAsync(u => u.UserId == userId);
        var tokenService = scope.ServiceProvider.GetRequiredService<IJwtTokenService>();
        var token = tokenService.GenerateToken(user.UserId, user.Email, "NORMAL_USER");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token.AccessToken);
    }
}
