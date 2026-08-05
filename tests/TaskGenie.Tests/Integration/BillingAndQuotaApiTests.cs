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

/// <summary>Slice 6B — plan catalog, free project quota, and the fake-payment matrix from the plan
/// (success, failure, cancel, refund, duplicate/idempotency, premium inheritance, cross-tenant).</summary>
public sealed class BillingAndQuotaApiTests
{
    // ── Plan catalog ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetPlans_ReturnsSeededCatalogFromDatabase()
    {
        await using var factory = new BillingApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user);

        var response = await client.GetAsync("/api/plans");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var plans = await response.Content.ReadFromJsonAsync<List<JsonElement>>();
        var codes = plans!.Select(p => p.GetProperty("code").GetString()).ToList();
        Assert.Contains("FREE_PERSONAL", codes);
        Assert.Contains("PRO_PERSONAL", codes);
        Assert.Contains("PRO_ORGANIZATION", codes);
    }

    [Fact]
    public async Task GetPlans_FilteredByAudience()
    {
        await using var factory = new BillingApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user);

        var response = await client.GetAsync("/api/plans?audience=ORGANIZATION");

        var plans = await response.Content.ReadFromJsonAsync<List<JsonElement>>();
        Assert.All(plans!, p => Assert.Equal("ORGANIZATION", p.GetProperty("audience").GetString()));
    }

    // ── Free project quota ───────────────────────────────────────────────────────────

    [Fact]
    public async Task FreeUser_CanCreateTwoProjects_ThirdIsBlockedWithUpgradeCode()
    {
        await using var factory = new BillingApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user);

        Assert.Equal(HttpStatusCode.Created, (await CreateProjectAsync(client, "One")).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await CreateProjectAsync(client, "Two")).StatusCode);

        var third = await CreateProjectAsync(client, "Three");
        Assert.Equal(HttpStatusCode.Forbidden, third.StatusCode);

        var body = await third.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("PLAN_UPGRADE_REQUIRED", body.GetProperty("code").GetString());
        Assert.Equal(2, body.GetProperty("limit").GetInt32());
        Assert.Equal(2, body.GetProperty("usage").GetInt32());

        await factory.WithDbAsync(db => Assert.Equal(2, db.Projects.Count(p => p.CreatedBy == user)));
    }

    [Fact]
    public async Task ArchivingAProject_FreesQuota()
    {
        await using var factory = new BillingApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user);

        var first = await CreateProjectAsync(client, "One");
        await CreateProjectAsync(client, "Two");
        Assert.Equal(HttpStatusCode.Forbidden, (await CreateProjectAsync(client, "Three")).StatusCode);

        var firstId = (await first.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("projectId").GetInt32();
        await factory.ArchiveProjectAsync(firstId);

        Assert.Equal(HttpStatusCode.Created, (await CreateProjectAsync(client, "Three again")).StatusCode);
    }

    [Fact]
    public async Task PremiumUser_ExceedsFreeLimit()
    {
        await using var factory = new BillingApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user);
        await factory.GrantActiveSubscriptionAsync(userId: user, planCode: "PRO_PERSONAL");

        Assert.Equal(HttpStatusCode.Created, (await CreateProjectAsync(client, "One")).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await CreateProjectAsync(client, "Two")).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await CreateProjectAsync(client, "Three")).StatusCode);
    }

    // ── Fake payment matrix ──────────────────────────────────────────────────────────

    [Fact]
    public async Task PersonalCheckout_SuccessActivatesSubscriptionAndGrantsPremium()
    {
        await using var factory = new BillingApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user);
        var planId = await factory.GetPlanIdAsync("PRO_PERSONAL");

        var checkout = await client.PostAsJsonAsync("/api/billing/checkout-sessions", new { planId, organizationId = (int?)null, idempotencyKey = (string?)null });
        Assert.Equal(HttpStatusCode.OK, checkout.StatusCode);
        var session = await checkout.Content.ReadFromJsonAsync<JsonElement>();
        var paymentId = session.GetProperty("paymentTransactionId").GetInt32();
        Assert.Equal("PENDING", session.GetProperty("status").GetString());

        var simulate = await client.PostAsJsonAsync($"/api/test-payments/{paymentId}/simulate", new { status = "SUCCEEDED" });
        Assert.Equal(HttpStatusCode.OK, simulate.StatusCode);

        await factory.WithDbAsync(db =>
        {
            Assert.Equal("SUCCEEDED", db.PaymentTransactions.Single(p => p.PaymentTransactionId == paymentId).Status);
            Assert.Equal("ACTIVE", db.Subscriptions.Single(s => s.UserId == user).Status);
        });

        var entitlement = await client.GetFromJsonAsync<JsonElement>("/api/billing/entitlement");
        Assert.True(entitlement.GetProperty("isPremium").GetBoolean());
    }

    [Fact]
    public async Task PaymentFailure_GrantsNoPremium()
    {
        await using var factory = new BillingApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user);
        var paymentId = await CreateCheckoutAsync(client, await factory.GetPlanIdAsync("PRO_PERSONAL"));

        await client.PostAsJsonAsync($"/api/test-payments/{paymentId}/simulate", new { status = "FAILED" });

        await factory.WithDbAsync(db =>
        {
            Assert.Equal("FAILED", db.PaymentTransactions.Single(p => p.PaymentTransactionId == paymentId).Status);
            Assert.Equal("PENDING", db.Subscriptions.Single(s => s.UserId == user).Status);
        });

        var entitlement = await client.GetFromJsonAsync<JsonElement>("/api/billing/entitlement");
        Assert.False(entitlement.GetProperty("isPremium").GetBoolean());
    }

    [Fact]
    public async Task DuplicateSimulateSuccess_IsIdempotent()
    {
        await using var factory = new BillingApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user);
        var paymentId = await CreateCheckoutAsync(client, await factory.GetPlanIdAsync("PRO_PERSONAL"));

        await client.PostAsJsonAsync($"/api/test-payments/{paymentId}/simulate", new { status = "SUCCEEDED" });
        var second = await client.PostAsJsonAsync($"/api/test-payments/{paymentId}/simulate", new { status = "SUCCEEDED" });

        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        await factory.WithDbAsync(db =>
        {
            Assert.Equal(1, db.Subscriptions.Count(s => s.UserId == user));
            Assert.Equal(1, db.PaymentTransactions.Count(p => p.UserId == user));
        });
    }

    [Fact]
    public async Task DuplicateCheckoutWithSameIdempotencyKey_ReusesTransaction()
    {
        await using var factory = new BillingApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user);
        var planId = await factory.GetPlanIdAsync("PRO_PERSONAL");

        var first = await client.PostAsJsonAsync("/api/billing/checkout-sessions", new { planId, organizationId = (int?)null, idempotencyKey = "key-123" });
        var second = await client.PostAsJsonAsync("/api/billing/checkout-sessions", new { planId, organizationId = (int?)null, idempotencyKey = "key-123" });

        var firstId = (await first.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("paymentTransactionId").GetInt32();
        var secondId = (await second.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("paymentTransactionId").GetInt32();

        Assert.Equal(firstId, secondId);
        await factory.WithDbAsync(db => Assert.Equal(1, db.PaymentTransactions.Count(p => p.UserId == user)));
    }

    [Fact]
    public async Task Refund_ExpiresSubscriptionAndRemovesPremium()
    {
        await using var factory = new BillingApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user);
        var paymentId = await CreateCheckoutAsync(client, await factory.GetPlanIdAsync("PRO_PERSONAL"));

        await client.PostAsJsonAsync($"/api/test-payments/{paymentId}/simulate", new { status = "SUCCEEDED" });
        await client.PostAsJsonAsync($"/api/test-payments/{paymentId}/simulate", new { status = "REFUNDED" });

        await factory.WithDbAsync(db =>
            Assert.Equal("EXPIRED", db.Subscriptions.Single(s => s.UserId == user).Status));

        var entitlement = await client.GetFromJsonAsync<JsonElement>("/api/billing/entitlement");
        Assert.False(entitlement.GetProperty("isPremium").GetBoolean());
    }

    [Fact]
    public async Task CancelSubscription_AtPeriodEnd_KeepsEntitlementUntilPeriodEnds()
    {
        await using var factory = new BillingApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user);
        var paymentId = await CreateCheckoutAsync(client, await factory.GetPlanIdAsync("PRO_PERSONAL"));
        await client.PostAsJsonAsync($"/api/test-payments/{paymentId}/simulate", new { status = "SUCCEEDED" });

        var cancel = await client.PostAsJsonAsync("/api/billing/subscription/cancel", new { organizationId = (int?)null, atPeriodEnd = true });

        Assert.Equal(HttpStatusCode.OK, cancel.StatusCode);
        var entitlement = await client.GetFromJsonAsync<JsonElement>("/api/billing/entitlement");
        Assert.True(entitlement.GetProperty("isPremium").GetBoolean()); // still inside the paid period
        await factory.WithDbAsync(db =>
            Assert.True(db.Subscriptions.Single(s => s.UserId == user).CancelAtPeriodEnd));
    }

    // ── Organization premium inheritance ─────────────────────────────────────────────

    [Fact]
    public async Task ActiveOrganizationMember_InheritsPremium_WithoutOwnSubscription()
    {
        await using var factory = new BillingApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        await factory.SeedMembershipAsync(orgId, owner, OrganizationRoles.Owner);
        await factory.SeedMembershipAsync(orgId, member, OrganizationRoles.Member);
        await factory.GrantActiveSubscriptionAsync(organizationId: orgId, planCode: "PRO_ORGANIZATION");

        await factory.AuthenticateAsync(client, member);
        var entitlement = await client.GetFromJsonAsync<JsonElement>("/api/billing/entitlement");

        Assert.True(entitlement.GetProperty("isPremium").GetBoolean());
        await factory.WithDbAsync(db =>
            Assert.False(db.Subscriptions.Any(s => s.UserId == member))); // inherited, not granted personally
    }

    /// <summary>
    /// Being invited to somebody's project is not a way to acquire their plan.
    ///
    /// Premium is inherited from an *organization* subscription, never from a personal one: a
    /// personal plan is bought for one person. Project membership only creates a TeamMember row,
    /// so it must leave the invitee's entitlement — and the AI assistant with it — untouched.
    /// </summary>
    [Fact]
    public async Task ProjectMember_DoesNotInheritTheInvitersPersonalPremium()
    {
        await using var factory = new BillingApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (inviteeId, inviteeEmail) = await factory.SeedUserWithEmailAsync();

        // The inviter pays for a personal plan that includes the assistant.
        await factory.GrantActiveSubscriptionAsync(userId: owner, planCode: "PRO_PERSONAL");

        var projectId = await factory.SeedPersonalProjectAsync(owner);
        await factory.AuthenticateAsync(client, owner);
        var addResponse = await client.PostAsJsonAsync($"/api/projects/{projectId}/members",
            new { email = inviteeEmail, role = "MEMBER" });
        Assert.Equal(HttpStatusCode.OK, addResponse.StatusCode);

        await factory.AuthenticateAsync(client, inviteeId);
        var entitlement = await client.GetFromJsonAsync<JsonElement>("/api/billing/entitlement");

        Assert.False(entitlement.GetProperty("isPremium").GetBoolean());
        Assert.False(entitlement.GetProperty("aiChatbotEnabled").GetBoolean());

        // And the endpoint itself refuses, not just the flag the UI reads.
        var ask = await client.PostAsJsonAsync("/api/ai-analysis/assistant",
            new { question = "What is at risk?" });
        Assert.Equal(HttpStatusCode.Forbidden, ask.StatusCode);
    }

    [Fact]
    public async Task RemovedMember_LosesInheritedPremium()
    {
        await using var factory = new BillingApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        await factory.SeedMembershipAsync(orgId, owner, OrganizationRoles.Owner);
        var membershipId = await factory.SeedMembershipAsync(orgId, member, OrganizationRoles.Member);
        await factory.GrantActiveSubscriptionAsync(organizationId: orgId, planCode: "PRO_ORGANIZATION");

        await factory.AuthenticateAsync(client, owner);
        await client.DeleteAsync($"/api/organizations/{orgId}/members/{membershipId}");

        await factory.AuthenticateAsync(client, member);
        var entitlement = await client.GetFromJsonAsync<JsonElement>("/api/billing/entitlement");
        Assert.False(entitlement.GetProperty("isPremium").GetBoolean());
    }

    [Fact]
    public async Task MemberKeepsPersonalPremium_WhenRemovedFromOrganization()
    {
        await using var factory = new BillingApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        await factory.SeedMembershipAsync(orgId, owner, OrganizationRoles.Owner);
        var membershipId = await factory.SeedMembershipAsync(orgId, member, OrganizationRoles.Member);
        await factory.GrantActiveSubscriptionAsync(organizationId: orgId, planCode: "PRO_ORGANIZATION");
        await factory.GrantActiveSubscriptionAsync(userId: member, planCode: "PRO_PERSONAL");

        await factory.AuthenticateAsync(client, owner);
        await client.DeleteAsync($"/api/organizations/{orgId}/members/{membershipId}");

        await factory.AuthenticateAsync(client, member);
        var entitlement = await client.GetFromJsonAsync<JsonElement>("/api/billing/entitlement");
        Assert.True(entitlement.GetProperty("isPremium").GetBoolean()); // personal plan survives
    }

    // ── Authorization ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task PlainMember_CannotBuyOrganizationPlan()
    {
        await using var factory = new BillingApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        await factory.SeedMembershipAsync(orgId, member, OrganizationRoles.Member);
        await factory.AuthenticateAsync(client, member);

        var response = await client.PostAsJsonAsync("/api/billing/checkout-sessions", new
        {
            planId = await factory.GetPlanIdAsync("PRO_ORGANIZATION"), organizationId = orgId, idempotencyKey = (string?)null
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task CrossTenantSimulate_IsRejected()
    {
        await using var factory = new BillingApiFactory();
        using var client = factory.CreateClient();
        var victim = await factory.SeedUserAsync();
        var attacker = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, victim);
        var paymentId = await CreateCheckoutAsync(client, await factory.GetPlanIdAsync("PRO_PERSONAL"));

        await factory.AuthenticateAsync(client, attacker);
        var response = await client.PostAsJsonAsync($"/api/test-payments/{paymentId}/simulate", new { status = "SUCCEEDED" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        await factory.WithDbAsync(db =>
            Assert.Equal("PENDING", db.PaymentTransactions.Single(p => p.PaymentTransactionId == paymentId).Status));
    }

    [Fact]
    public async Task PersonalPlanCannotBeBoughtForOrganization()
    {
        await using var factory = new BillingApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        await factory.SeedMembershipAsync(orgId, owner, OrganizationRoles.Owner);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PostAsJsonAsync("/api/billing/checkout-sessions", new
        {
            planId = await factory.GetPlanIdAsync("PRO_PERSONAL"), organizationId = orgId, idempotencyKey = (string?)null
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PaymentHistory_ReturnsOnlyCallersPayments()
    {
        await using var factory = new BillingApiFactory();
        using var client = factory.CreateClient();
        var userA = await factory.SeedUserAsync();
        var userB = await factory.SeedUserAsync();
        var planId = await factory.GetPlanIdAsync("PRO_PERSONAL");

        await factory.AuthenticateAsync(client, userA);
        await CreateCheckoutAsync(client, planId);

        await factory.AuthenticateAsync(client, userB);
        var payments = await client.GetFromJsonAsync<List<JsonElement>>("/api/billing/payments");

        Assert.Empty(payments!);
    }

    [Fact]
    public async Task BillingEndpoints_Anonymous_ReturnUnauthorized()
    {
        await using var factory = new BillingApiFactory();
        using var client = factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/billing/entitlement")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/billing/payments")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await client.PostAsJsonAsync("/api/billing/checkout-sessions", new { planId = 1, organizationId = (int?)null, idempotencyKey = (string?)null })).StatusCode);
    }

    // ── helpers ──────────────────────────────────────────────────────────────────────

    private static Task<HttpResponseMessage> CreateProjectAsync(HttpClient client, string name)
        => client.PostAsJsonAsync("/api/projects", new
        {
            name, description = (string?)null, organizationId = (int?)null, deadline = (DateOnly?)null
        });

    private static async Task<int> CreateCheckoutAsync(HttpClient client, int planId)
    {
        var response = await client.PostAsJsonAsync("/api/billing/checkout-sessions",
            new { planId, organizationId = (int?)null, idempotencyKey = (string?)null });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("paymentTransactionId").GetInt32();
    }
}

public sealed class BillingApiFactory : WebApplicationFactory<Program>
{
    private const string TestJwtSecret = "taskgenie-billing-quota-test-secret-32chars";
    private readonly string _databaseName = $"taskgenie-billing-{Guid.NewGuid()}";

    public BillingApiFactory()
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
        var user = User.Create($"User {Guid.NewGuid():N}", $"user-{Guid.NewGuid():N}@billing.test", "hash");
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user.UserId;
    }

    /// <summary>The project-member endpoint invites by email, so the caller needs it back.</summary>
    public async Task<(int UserId, string Email)> SeedUserWithEmailAsync()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();
        var email = $"user-{Guid.NewGuid():N}@billing.test";
        var user = User.Create($"User {Guid.NewGuid():N}", email, "hash");
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return (user.UserId, email);
    }

    /// <summary>A personal project with its own dedicated team, as project creation produces.</summary>
    public async Task<int> SeedPersonalProjectAsync(int ownerId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();

        var team = Team.Create($"Team {Guid.NewGuid():N}", null, ownerId, isProjectManaged: true);
        context.Teams.Add(team);
        await context.SaveChangesAsync();

        context.TeamMembers.Add(TeamMember.Create(team.TeamId, ownerId, "LEADER"));
        var project = Project.Create($"Project {Guid.NewGuid():N}", null, ownerId);
        project.SetTeamId(team.TeamId);
        context.Projects.Add(project);
        await context.SaveChangesAsync();
        return project.ProjectId;
    }

    public async Task<int> SeedOrganizationAsync(int ownerId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();
        var org = Organization.Create($"Org {Guid.NewGuid():N}", null, ownerId);
        context.Organizations.Add(org);
        await context.SaveChangesAsync();
        return org.OrganizationId;
    }

    public async Task<int> SeedMembershipAsync(int organizationId, int userId, string role)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var existing = await context.OrganizationMembers
            .SingleOrDefaultAsync(m => m.OrganizationId == organizationId && m.UserId == userId);
        if (existing is not null) return existing.OrganizationMemberId;
        var member = OrganizationMember.Create(organizationId, userId, role);
        context.OrganizationMembers.Add(member);
        await context.SaveChangesAsync();
        return member.OrganizationMemberId;
    }

    public async Task<int> GetPlanIdAsync(string code)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();
        return (await context.Plans.SingleAsync(p => p.Code == code)).PlanId;
    }

    /// <summary>Grants an already-ACTIVE subscription directly, for tests whose subject is
    /// entitlement rather than the checkout flow.</summary>
    public async Task GrantActiveSubscriptionAsync(string planCode, int? userId = null, int? organizationId = null)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var plan = await context.Plans.SingleAsync(p => p.Code == planCode);
        var subscription = userId is int uid
            ? Subscription.CreateForUser(plan.PlanId, uid)
            : Subscription.CreateForOrganization(plan.PlanId, organizationId!.Value);
        subscription.Activate(DateTime.UtcNow.AddMonths(1));
        context.Subscriptions.Add(subscription);
        await context.SaveChangesAsync();
    }

    public async Task ArchiveProjectAsync(int projectId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var project = await context.Projects.SingleAsync(p => p.ProjectId == projectId);
        project.Update(null, null, "Archived", null, null);
        await context.SaveChangesAsync();
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
