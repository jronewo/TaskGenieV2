using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
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

/// <summary>Slice 7 — platform administration and skill catalog management.</summary>
public sealed class AdminAndSkillCatalogApiTests
{
    // ── Admin authorization ──────────────────────────────────────────────────────────

    [Theory]
    [InlineData("/api/admin/users")]
    [InlineData("/api/admin/organizations")]
    [InlineData("/api/admin/subscriptions")]
    [InlineData("/api/admin/payments")]
    [InlineData("/api/admin/plans")]
    [InlineData("/api/admin/subscription-analytics")]
    public async Task AdminEndpoints_NormalUser_ReturnForbidden(string route)
    {
        await using var factory = new AdminApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user);

        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync(route)).StatusCode);
    }

    [Theory]
    [InlineData("/api/admin/users")]
    [InlineData("/api/admin/plans")]
    [InlineData("/api/admin/subscription-analytics")]
    public async Task AdminEndpoints_Anonymous_ReturnUnauthorized(string route)
    {
        await using var factory = new AdminApiFactory();
        using var client = factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(route)).StatusCode);
    }

    // ── User administration ──────────────────────────────────────────────────────────

    [Fact]
    public async Task SearchUsers_PaginatesAndFilters()
    {
        await using var factory = new AdminApiFactory();
        using var client = factory.CreateClient();
        var admin = await factory.SeedUserAsync("PLATFORM_ADMIN");
        await factory.SeedNamedUserAsync("Findable Person", "findable@admin.test");
        await factory.AuthenticateAsync(client, admin, "PLATFORM_ADMIN");

        var response = await client.GetFromJsonAsync<JsonElement>("/api/admin/users?search=Findable");

        Assert.Equal(1, response.GetProperty("total").GetInt32());
        Assert.Equal("Findable Person", response.GetProperty("items")[0].GetProperty("name").GetString());
    }

    [Fact]
    public async Task DeactivateUser_RevokesTheirSessions()
    {
        await using var factory = new AdminApiFactory();
        using var client = factory.CreateClient();
        var admin = await factory.SeedUserAsync("PLATFORM_ADMIN");
        var victim = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, admin, "PLATFORM_ADMIN");

        var response = await client.PutAsJsonAsync($"/api/admin/users/{victim}/status", new { status = 0 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await factory.WithDbAsync(db => Assert.Equal(0, db.Users.Single(u => u.UserId == victim).Status));
    }

    [Fact]
    public async Task Admin_CannotDeactivateThemselves()
    {
        await using var factory = new AdminApiFactory();
        using var client = factory.CreateClient();
        var admin = await factory.SeedUserAsync("PLATFORM_ADMIN");
        await factory.AuthenticateAsync(client, admin, "PLATFORM_ADMIN");

        var response = await client.PutAsJsonAsync($"/api/admin/users/{admin}/status", new { status = 0 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task DemotingTheLastAdmin_IsRejected()
    {
        await using var factory = new AdminApiFactory();
        using var client = factory.CreateClient();
        var onlyAdmin = await factory.SeedUserAsync("PLATFORM_ADMIN");
        await factory.AuthenticateAsync(client, onlyAdmin, "PLATFORM_ADMIN");

        var response = await client.PutAsJsonAsync($"/api/admin/users/{onlyAdmin}/role", new { role = "NORMAL_USER" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await factory.WithDbAsync(db =>
            Assert.Equal("PLATFORM_ADMIN", db.Users.Single(u => u.UserId == onlyAdmin).Role));
    }

    [Fact]
    public async Task PromoteAndDemote_WorksWhenAnotherAdminRemains()
    {
        await using var factory = new AdminApiFactory();
        using var client = factory.CreateClient();
        var admin = await factory.SeedUserAsync("PLATFORM_ADMIN");
        var other = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, admin, "PLATFORM_ADMIN");

        Assert.Equal(HttpStatusCode.OK,
            (await client.PutAsJsonAsync($"/api/admin/users/{other}/role", new { role = "PLATFORM_ADMIN" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK,
            (await client.PutAsJsonAsync($"/api/admin/users/{other}/role", new { role = "NORMAL_USER" })).StatusCode);
    }

    // ── Plan administration ──────────────────────────────────────────────────────────

    [Fact]
    public async Task AdminPlans_IncludeArchivedWhilePublicCatalogDoesNot()
    {
        await using var factory = new AdminApiFactory();
        using var client = factory.CreateClient();
        var admin = await factory.SeedUserAsync("PLATFORM_ADMIN");
        await factory.AuthenticateAsync(client, admin, "PLATFORM_ADMIN");
        var planId = await factory.GetPlanIdAsync("PRO_PERSONAL");

        await client.PutAsJsonAsync($"/api/admin/plans/{planId}/active", new { isActive = false });

        var adminPlans = await client.GetFromJsonAsync<List<JsonElement>>("/api/admin/plans");
        Assert.Contains(adminPlans!, p => p.GetProperty("planId").GetInt32() == planId);

        var publicPlans = await client.GetFromJsonAsync<List<JsonElement>>("/api/plans");
        Assert.DoesNotContain(publicPlans!, p => p.GetProperty("planId").GetInt32() == planId);
    }

    [Fact]
    public async Task ArchivedPlan_CannotBePurchased()
    {
        await using var factory = new AdminApiFactory();
        using var client = factory.CreateClient();
        var admin = await factory.SeedUserAsync("PLATFORM_ADMIN");
        var buyer = await factory.SeedUserAsync();
        var planId = await factory.GetPlanIdAsync("PRO_PERSONAL");

        await factory.AuthenticateAsync(client, admin, "PLATFORM_ADMIN");
        await client.PutAsJsonAsync($"/api/admin/plans/{planId}/active", new { isActive = false });

        await factory.AuthenticateAsync(client, buyer);
        var checkout = await client.PostAsJsonAsync("/api/billing/checkout-sessions",
            new { planId, organizationId = (int?)null, idempotencyKey = (string?)null });

        Assert.Equal(HttpStatusCode.BadRequest, checkout.StatusCode);
    }

    [Fact]
    public async Task CreatePlan_RejectsDuplicateCode()
    {
        await using var factory = new AdminApiFactory();
        using var client = factory.CreateClient();
        var admin = await factory.SeedUserAsync("PLATFORM_ADMIN");
        await factory.AuthenticateAsync(client, admin, "PLATFORM_ADMIN");

        var response = await client.PostAsJsonAsync("/api/admin/plans", new
        {
            code = "PRO_PERSONAL", name = "Duplicate", audience = "PERSONAL",
            billingInterval = "MONTHLY", priceMinor = 100, currency = "USD",
            projectLimit = (int?)null, memberLimit = (int?)null, sortOrder = 9
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdatePlan_ChangesPriceAndLimit()
    {
        await using var factory = new AdminApiFactory();
        using var client = factory.CreateClient();
        var admin = await factory.SeedUserAsync("PLATFORM_ADMIN");
        await factory.AuthenticateAsync(client, admin, "PLATFORM_ADMIN");
        var planId = await factory.GetPlanIdAsync("FREE_PERSONAL");

        var response = await client.PutAsJsonAsync($"/api/admin/plans/{planId}", new
        {
            name = "Free tier", priceMinor = (int?)0, projectLimit = (int?)3,
            memberLimit = (int?)null, sortOrder = (int?)null
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await factory.WithDbAsync(db => Assert.Equal(3, db.Plans.Single(p => p.PlanId == planId).ProjectLimit));
    }

    [Fact]
    public async Task SubscriptionAnalytics_SeparatesTestRevenue()
    {
        await using var factory = new AdminApiFactory();
        using var client = factory.CreateClient();
        var admin = await factory.SeedUserAsync("PLATFORM_ADMIN");
        var buyer = await factory.SeedUserAsync();
        var planId = await factory.GetPlanIdAsync("PRO_PERSONAL");

        await factory.AuthenticateAsync(client, buyer);
        var checkout = await client.PostAsJsonAsync("/api/billing/checkout-sessions",
            new { planId, organizationId = (int?)null, idempotencyKey = (string?)null });
        var paymentId = (await checkout.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("paymentTransactionId").GetInt32();
        await client.PostAsJsonAsync($"/api/test-payments/{paymentId}/simulate", new { status = "SUCCEEDED" });

        await factory.AuthenticateAsync(client, admin, "PLATFORM_ADMIN");
        var analytics = await client.GetFromJsonAsync<JsonElement>("/api/admin/subscription-analytics");

        Assert.Equal(1, analytics.GetProperty("activeSubscriptions").GetInt32());
        // Simulated money must never be counted as real revenue.
        Assert.Equal(0, analytics.GetProperty("totalRevenueMinor").GetInt32());
        Assert.Equal(249000, analytics.GetProperty("testRevenueMinor").GetInt32());
    }

    // ── Skill catalog ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task ArchivedSkill_HiddenFromUsersButVisibleToAdmin()
    {
        await using var factory = new AdminApiFactory();
        using var client = factory.CreateClient();
        var admin = await factory.SeedUserAsync("PLATFORM_ADMIN");
        var user = await factory.SeedUserAsync();
        var skillId = await factory.SeedSkillAsync("Legacy Skill");

        await factory.AuthenticateAsync(client, admin, "PLATFORM_ADMIN");
        await client.PutAsJsonAsync($"/api/skills/{skillId}/active", new { isActive = false });

        var adminCatalog = await client.GetFromJsonAsync<List<JsonElement>>("/api/skills/admin");
        Assert.Contains(adminCatalog!, s => s.GetProperty("skillId").GetInt32() == skillId);

        await factory.AuthenticateAsync(client, user);
        var publicCatalog = await client.GetFromJsonAsync<List<JsonElement>>("/api/skills");
        Assert.DoesNotContain(publicCatalog!, s => s.GetProperty("skillId").GetInt32() == skillId);
    }

    [Fact]
    public async Task RenameSkill_RejectsDuplicateName()
    {
        await using var factory = new AdminApiFactory();
        using var client = factory.CreateClient();
        var admin = await factory.SeedUserAsync("PLATFORM_ADMIN");
        await factory.SeedSkillAsync("Existing");
        var target = await factory.SeedSkillAsync("Target");
        await factory.AuthenticateAsync(client, admin, "PLATFORM_ADMIN");

        var response = await client.PutAsJsonAsync($"/api/skills/{target}", new { skillName = "Existing" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task SkillAdminRoutes_NormalUser_ReturnForbidden()
    {
        await using var factory = new AdminApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        var skillId = await factory.SeedSkillAsync("Some Skill");
        await factory.AuthenticateAsync(client, user);

        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/skills/admin")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await client.PutAsJsonAsync($"/api/skills/{skillId}", new { skillName = "Renamed" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await client.PutAsJsonAsync($"/api/skills/{skillId}/active", new { isActive = false })).StatusCode);
    }

    [Fact]
    public async Task GetMySkills_ReturnsOnlyCallersSkills()
    {
        await using var factory = new AdminApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        var other = await factory.SeedUserAsync();
        var skillId = await factory.SeedSkillAsync("Mine");
        await factory.SeedUserSkillAsync(other, skillId, 5);
        await factory.AuthenticateAsync(client, user);

        await client.PostAsJsonAsync("/api/skills/user", new { skillId, level = 3 });
        var mine = await client.GetFromJsonAsync<List<JsonElement>>("/api/skills/me");

        Assert.Single(mine!);
        Assert.Equal(user, mine![0].GetProperty("userId").GetInt32());
    }
}

public sealed class AdminApiFactory : WebApplicationFactory<Program>
{
    private const string TestJwtSecret = "taskgenie-admin-skill-catalog-test-secret32";
    private readonly string _databaseName = $"taskgenie-admin-{Guid.NewGuid()}";

    public AdminApiFactory()
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

    public async Task<int> SeedUserAsync(string role = "NORMAL_USER")
        => await SeedNamedUserAsync($"User {Guid.NewGuid():N}", $"user-{Guid.NewGuid():N}@admin.test", role);

    public async Task<int> SeedNamedUserAsync(string name, string email, string role = "NORMAL_USER")
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();
        var user = User.Create(name, email, "hash", role);
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user.UserId;
    }

    public async Task<int> SeedSkillAsync(string name)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();
        // Each test owns its own in-memory database, so exact names are safe and let tests assert
        // on duplicate-name behaviour.
        var skill = Skill.Create(name);
        context.Skills.Add(skill);
        await context.SaveChangesAsync();
        return skill.SkillId;
    }

    public async Task SeedUserSkillAsync(int userId, int skillId, int level)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        context.UserSkills.Add(UserSkill.Create(userId, skillId, level));
        await context.SaveChangesAsync();
    }

    public async Task<int> GetPlanIdAsync(string code)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();
        return (await context.Plans.SingleAsync(p => p.Code == code)).PlanId;
    }

    public async Task AuthenticateAsync(HttpClient client, int userId, string role = "NORMAL_USER")
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await context.Users.SingleAsync(u => u.UserId == userId);
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
