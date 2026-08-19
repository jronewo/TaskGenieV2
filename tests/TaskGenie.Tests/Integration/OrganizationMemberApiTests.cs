using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using TaskGenie.Application.Features.Organizations.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Tests.Integration;

/// <summary>Slice 6 — organization membership: registration, member management, role rules and
/// project staffing, including the tenant-isolation negatives from the plan.</summary>
public sealed class OrganizationMemberApiTests
{
    // ── Registration ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateOrganization_MakesCreatorAnActiveOwnerMember()
    {
        await using var factory = new OrganizationMemberApiFactory();
        using var client = factory.CreateClient();
        var actor = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, actor);

        var response = await client.PostAsJsonAsync("/api/organizations", new { name = "Acme", description = "Test org" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var org = await response.Content.ReadFromJsonAsync<OrganizationDto>();
        await factory.WithDbAsync(db =>
        {
            var membership = db.OrganizationMembers.Single(m => m.OrganizationId == org!.OrganizationId);
            Assert.Equal(actor, membership.UserId);
            Assert.Equal(OrganizationRoles.Owner, membership.Role);
            Assert.Equal(OrganizationMemberStatuses.Active, membership.Status);
        });
    }

    [Fact]
    public async Task CreateOrganization_OwnerIsAlwaysJwtActor()
    {
        await using var factory = new OrganizationMemberApiFactory();
        using var client = factory.CreateClient();
        var actor = await factory.SeedUserAsync();
        var impersonated = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, actor);

        var response = await client.PostAsJsonAsync("/api/organizations", new
        {
            name = "Forged", description = (string?)null, ownerId = impersonated
        });

        var org = await response.Content.ReadFromJsonAsync<OrganizationDto>();
        Assert.Equal(actor, org!.OwnerId);
        Assert.NotEqual(impersonated, org.OwnerId);
    }

    [Fact]
    public async Task GetMine_ReturnsOrganizationsWhereCallerIsActiveMember()
    {
        await using var factory = new OrganizationMemberApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        await factory.SeedMembershipAsync(orgId, member, OrganizationRoles.Member);
        await factory.AuthenticateAsync(client, member);

        var response = await client.GetAsync("/api/organizations/mine");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<List<System.Text.Json.JsonElement>>();
        Assert.Single(body!);
        Assert.Equal(orgId, body![0].GetProperty("organizationId").GetInt32());
        Assert.False(body[0].GetProperty("isOwner").GetBoolean());
    }

    // ── Member management ────────────────────────────────────────────────────────────

    [Fact]
    public async Task AddMember_ByEmail_CreatesActiveMembership()
    {
        await using var factory = new OrganizationMemberApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (inviteeId, inviteeEmail) = await factory.SeedUserWithEmailAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PostAsJsonAsync($"/api/organizations/{orgId}/members",
            new { email = inviteeEmail, role = OrganizationRoles.Member });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await factory.WithDbAsync(db =>
            Assert.True(db.OrganizationMembers.Any(m =>
                m.OrganizationId == orgId && m.UserId == inviteeId && m.Status == OrganizationMemberStatuses.Active)));
    }

    [Fact]
    public async Task AddMember_Duplicate_IsRejected()
    {
        await using var factory = new OrganizationMemberApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (inviteeId, inviteeEmail) = await factory.SeedUserWithEmailAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        await factory.SeedMembershipAsync(orgId, inviteeId, OrganizationRoles.Member);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PostAsJsonAsync($"/api/organizations/{orgId}/members",
            new { email = inviteeEmail, role = OrganizationRoles.Member });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddMember_UnknownEmail_ReturnsNotFound()
    {
        await using var factory = new OrganizationMemberApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PostAsJsonAsync($"/api/organizations/{orgId}/members",
            new { email = "nobody@nowhere.test", role = OrganizationRoles.Member });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task AddMember_PlainMemberCannotManage_IsRejected()
    {
        await using var factory = new OrganizationMemberApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var (_, outsiderEmail) = await factory.SeedUserWithEmailAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        await factory.SeedMembershipAsync(orgId, member, OrganizationRoles.Member);
        await factory.AuthenticateAsync(client, member);

        var response = await client.PostAsJsonAsync($"/api/organizations/{orgId}/members",
            new { email = outsiderEmail, role = OrganizationRoles.Member });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task UpdateMemberRole_OwnerPromotesMemberToOrgAdmin()
    {
        await using var factory = new OrganizationMemberApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        var membershipId = await factory.SeedMembershipAsync(orgId, member, OrganizationRoles.Member);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PutAsJsonAsync(
            $"/api/organizations/{orgId}/members/{membershipId}/role", new { role = OrganizationRoles.OrgAdmin });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await factory.WithDbAsync(db =>
            Assert.Equal(OrganizationRoles.OrgAdmin,
                db.OrganizationMembers.Single(m => m.OrganizationMemberId == membershipId).Role));
    }

    [Fact]
    public async Task UpdateMemberRole_DemotingTheLastOwner_IsRejected()
    {
        await using var factory = new OrganizationMemberApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        var ownerMembershipId = await factory.SeedMembershipAsync(orgId, owner, OrganizationRoles.Owner);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PutAsJsonAsync(
            $"/api/organizations/{orgId}/members/{ownerMembershipId}/role", new { role = OrganizationRoles.Member });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await factory.WithDbAsync(db =>
            Assert.Equal(OrganizationRoles.Owner,
                db.OrganizationMembers.Single(m => m.OrganizationMemberId == ownerMembershipId).Role));
    }

    [Fact]
    public async Task RemoveMember_MarksMembershipRemoved()
    {
        await using var factory = new OrganizationMemberApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        var membershipId = await factory.SeedMembershipAsync(orgId, member, OrganizationRoles.Member);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.DeleteAsync($"/api/organizations/{orgId}/members/{membershipId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await factory.WithDbAsync(db =>
            Assert.Equal(OrganizationMemberStatuses.Removed,
                db.OrganizationMembers.Single(m => m.OrganizationMemberId == membershipId).Status));
    }

    [Fact]
    public async Task RemoveMember_LastOwner_IsRejected()
    {
        await using var factory = new OrganizationMemberApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        var ownerMembershipId = await factory.SeedMembershipAsync(orgId, owner, OrganizationRoles.Owner);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.DeleteAsync($"/api/organizations/{orgId}/members/{ownerMembershipId}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task RemovedMember_LosesAccessImmediately()
    {
        await using var factory = new OrganizationMemberApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        var membershipId = await factory.SeedMembershipAsync(orgId, member, OrganizationRoles.Member);

        // Member can read while active.
        await factory.AuthenticateAsync(client, member);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/api/organizations/{orgId}")).StatusCode);

        // Owner removes them.
        await factory.AuthenticateAsync(client, owner);
        await client.DeleteAsync($"/api/organizations/{orgId}/members/{membershipId}");

        // Access is gone on the very next call.
        await factory.AuthenticateAsync(client, member);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync($"/api/organizations/{orgId}")).StatusCode);
    }

    // ── Tenant isolation ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetMembers_Outsider_IsRejected()
    {
        await using var factory = new OrganizationMemberApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        await factory.AuthenticateAsync(client, outsider);

        var response = await client.GetAsync($"/api/organizations/{orgId}/members");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task UpdateMemberRole_MemberFromAnotherOrganization_ReturnsNotFound()
    {
        await using var factory = new OrganizationMemberApiFactory();
        using var client = factory.CreateClient();
        var ownerA = await factory.SeedUserAsync();
        var ownerB = await factory.SeedUserAsync();
        var victim = await factory.SeedUserAsync();
        var orgA = await factory.SeedOrganizationAsync(ownerA);
        var orgB = await factory.SeedOrganizationAsync(ownerB);
        var membershipInB = await factory.SeedMembershipAsync(orgB, victim, OrganizationRoles.Member);
        await factory.AuthenticateAsync(client, ownerA);

        var response = await client.PutAsJsonAsync(
            $"/api/organizations/{orgA}/members/{membershipInB}/role", new { role = OrganizationRoles.OrgAdmin });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        await factory.WithDbAsync(db =>
            Assert.Equal(OrganizationRoles.Member,
                db.OrganizationMembers.Single(m => m.OrganizationMemberId == membershipInB).Role));
    }

    // ── Project staffing ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task AssignMember_AddsOrganizationMemberToProjectTeam()
    {
        await using var factory = new OrganizationMemberApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        await factory.SeedMembershipAsync(orgId, owner, OrganizationRoles.Owner);
        await factory.SeedMembershipAsync(orgId, member, OrganizationRoles.Member);
        var (projectId, teamId) = await factory.SeedOrganizationProjectAsync(owner, orgId);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PostAsJsonAsync(
            $"/api/organizations/{orgId}/projects/{projectId}/assign-member", new { userId = member, asLeader = false });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await factory.WithDbAsync(db =>
            Assert.True(db.TeamMembers.Any(m => m.TeamId == teamId && m.UserId == member && m.Role == "MEMBER")));
    }

    [Fact]
    public async Task AssignMember_AsLeader_PromotesToProjectLeader()
    {
        await using var factory = new OrganizationMemberApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        await factory.SeedMembershipAsync(orgId, owner, OrganizationRoles.Owner);
        await factory.SeedMembershipAsync(orgId, member, OrganizationRoles.Member);
        var (projectId, teamId) = await factory.SeedOrganizationProjectAsync(owner, orgId);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PostAsJsonAsync(
            $"/api/organizations/{orgId}/projects/{projectId}/assign-member", new { userId = member, asLeader = true });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await factory.WithDbAsync(db =>
            Assert.Equal("LEADER", db.TeamMembers.Single(m => m.TeamId == teamId && m.UserId == member).Role));
    }

    [Fact]
    public async Task AssignMember_UserOutsideOrganization_IsRejected()
    {
        await using var factory = new OrganizationMemberApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        await factory.SeedMembershipAsync(orgId, owner, OrganizationRoles.Owner);
        var (projectId, teamId) = await factory.SeedOrganizationProjectAsync(owner, orgId);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PostAsJsonAsync(
            $"/api/organizations/{orgId}/projects/{projectId}/assign-member", new { userId = outsider, asLeader = false });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await factory.WithDbAsync(db =>
            Assert.False(db.TeamMembers.Any(m => m.TeamId == teamId && m.UserId == outsider)));
    }

    [Fact]
    public async Task AssignMember_ProjectFromAnotherOrganization_ReturnsNotFound()
    {
        await using var factory = new OrganizationMemberApiFactory();
        using var client = factory.CreateClient();
        var ownerA = await factory.SeedUserAsync();
        var ownerB = await factory.SeedUserAsync();
        var orgA = await factory.SeedOrganizationAsync(ownerA);
        var orgB = await factory.SeedOrganizationAsync(ownerB);
        await factory.SeedMembershipAsync(orgA, ownerA, OrganizationRoles.Owner);
        var (projectInB, _) = await factory.SeedOrganizationProjectAsync(ownerB, orgB);
        await factory.AuthenticateAsync(client, ownerA);

        var response = await client.PostAsJsonAsync(
            $"/api/organizations/{orgA}/projects/{projectInB}/assign-member", new { userId = ownerA, asLeader = false });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task OrganizationEndpoints_Anonymous_ReturnUnauthorized()
    {
        await using var factory = new OrganizationMemberApiFactory();
        using var client = factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized,
            (await client.PostAsJsonAsync("/api/organizations", new { name = "X", description = (string?)null })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/organizations/mine")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/organizations/1/members")).StatusCode);
    }
}

/// <summary>
/// Promoting somebody already on the project. The UI's "Set Project Leader" button used to open the
/// same dialog as "Add member" with the leader box unticked, so it silently did nothing for an
/// existing member — the rule it depends on is that a second assign changes the role rather than
/// being ignored as a duplicate.
/// </summary>
public sealed class OrganizationProjectLeaderApiTests
{
    [Fact]
    public async Task AssigningAgainAsLeader_PromotesAnExistingMember()
    {
        await using var factory = new OrganizationMemberApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var mate = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        await factory.SeedMembershipAsync(orgId, mate, "MEMBER");
        var (projectId, teamId) = await factory.SeedOrganizationProjectAsync(owner, orgId);
        await factory.AuthenticateAsync(client, owner, "NORMAL_USER");

        var asMember = await client.PostAsJsonAsync(
            $"/api/organizations/{orgId}/projects/{projectId}/assign-member",
            new { userId = mate, asLeader = false });
        Assert.True(asMember.IsSuccessStatusCode);
        await factory.WithDbAsync(context =>
            Assert.Equal("MEMBER", context.TeamMembers.Single(m => m.TeamId == teamId && m.UserId == mate).Role));

        var asLeader = await client.PostAsJsonAsync(
            $"/api/organizations/{orgId}/projects/{projectId}/assign-member",
            new { userId = mate, asLeader = true });

        Assert.True(asLeader.IsSuccessStatusCode);
        await factory.WithDbAsync(context =>
            Assert.Equal("LEADER", context.TeamMembers.Single(m => m.TeamId == teamId && m.UserId == mate).Role));
    }

    [Theory]
    [InlineData("OWNER", true)]
    [InlineData("ORG_ADMIN", true)]
    [InlineData("MEMBER", false)]
    public async Task OnlyOwnersAndAdmins_MayCreateAProjectUnderTheOrganisation(string role, bool allowed)
    {
        await using var factory = new OrganizationMemberApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var actor = role == "OWNER" ? owner : await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        if (role != "OWNER") await factory.SeedMembershipAsync(orgId, actor, role);
        await factory.AuthenticateAsync(client, actor, "NORMAL_USER");

        var response = await client.PostAsJsonAsync(
            "/api/projects",
            new { name = $"Org project {role}", description = (string?)null, organizationId = orgId, deadline = (string?)null });

        // The handler used to allow the owner only, which locked out the admins the organization
        // page lets you appoint.
        Assert.Equal(allowed, response.IsSuccessStatusCode);
        await factory.WithDbAsync(context =>
            Assert.Equal(allowed, context.Projects.Any(p => p.OrganizationId == orgId)));
    }

    [Fact]
    public async Task PromotingSomeoneOutsideTheOrganisation_IsRefused()
    {
        await using var factory = new OrganizationMemberApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        var (projectId, teamId) = await factory.SeedOrganizationProjectAsync(owner, orgId);
        await factory.AuthenticateAsync(client, owner, "NORMAL_USER");

        var response = await client.PostAsJsonAsync(
            $"/api/organizations/{orgId}/projects/{projectId}/assign-member",
            new { userId = outsider, asLeader = true });

        Assert.False(response.IsSuccessStatusCode);
        await factory.WithDbAsync(context =>
            Assert.DoesNotContain(context.TeamMembers, m => m.TeamId == teamId && m.UserId == outsider));
    }
}

public sealed class OrganizationMemberApiFactory : WebApplicationFactory<Program>
{
    private const string TestJwtSecret = "taskgenie-organization-member-test-secret32";
    private readonly string _databaseName = $"taskgenie-orgmember-{Guid.NewGuid()}";

    public OrganizationMemberApiFactory()
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
        var (id, _) = await SeedUserWithEmailAsync();
        return id;
    }

    public async Task<(int UserId, string Email)> SeedUserWithEmailAsync()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();
        var email = $"user-{Guid.NewGuid():N}@orgmember.test";
        var user = User.Create($"User {Guid.NewGuid():N}", email, "hash");
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return (user.UserId, email);
    }

    /// <summary>
    /// Organizations are a paid-only feature — there is no free organization tier — so a seeded
    /// organization carries an active paid subscription by default. Pass
    /// <paramref name="withActiveSubscription"/> = false to build the unpaid case on purpose.
    /// </summary>
    public async Task<int> SeedOrganizationAsync(int ownerId, bool withActiveSubscription = true)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();
        var org = Organization.Create($"Org {Guid.NewGuid():N}", null, ownerId);
        context.Organizations.Add(org);
        await context.SaveChangesAsync();

        if (withActiveSubscription)
            await SeedOrganizationSubscriptionAsync(context, org.OrganizationId);

        return org.OrganizationId;
    }

    /// <summary>An ACTIVE organization plan with a period end well in the future.</summary>
    private static async Task SeedOrganizationSubscriptionAsync(AppDbContext context, int organizationId)
    {
        var plan = Plan.Create(
            $"PRO_ORG_{Guid.NewGuid():N}", "Organization Pro", "ORGANIZATION", "MONTHLY",
            priceMinor: 1_199_000, currency: "VND", projectLimit: null, memberLimit: null,
            sortOrder: 0, aiChatbotEnabled: true);
        context.Plans.Add(plan);
        await context.SaveChangesAsync();

        var subscription = Subscription.CreateForOrganization(plan.PlanId, organizationId);
        subscription.Activate(DateTime.UtcNow.AddDays(30));
        context.Subscriptions.Add(subscription);
        await context.SaveChangesAsync();
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

    public async Task<(int ProjectId, int TeamId)> SeedOrganizationProjectAsync(int createdBy, int organizationId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var team = Team.Create($"Team {Guid.NewGuid():N}", null, createdBy);
        context.Teams.Add(team);
        await context.SaveChangesAsync();

        var project = Project.Create($"Project {Guid.NewGuid():N}", null, createdBy, organizationId);
        project.SetTeamId(team.TeamId);
        context.Projects.Add(project);
        await context.SaveChangesAsync();

        return (project.ProjectId, team.TeamId);
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
