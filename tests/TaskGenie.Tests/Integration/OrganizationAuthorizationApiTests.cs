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

/// <summary>Covers the PROD-0202 gap found and fixed in this session: OrganizationsController had
/// no authorization checks at all (any authenticated user could read any organization's data),
/// and EvaluateProject took the actor (EvaluatorId) straight from the client body, violating the
/// "actor always from JWT" rule.</summary>
public sealed class OrganizationAuthorizationApiTests
{
    [Fact]
    public async Task GetOrganization_Anonymous_ReturnsUnauthorized()
    {
        await using var factory = new OrganizationAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);

        var response = await client.GetAsync($"/api/organizations/{orgId}");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetOrganization_NonOwnerNonAdmin_ReturnsForbidden()
    {
        await using var factory = new OrganizationAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        await factory.AuthenticateAsync(client, outsider, "NORMAL_USER");

        var response = await client.GetAsync($"/api/organizations/{orgId}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetOrganization_Owner_ReturnsOk()
    {
        await using var factory = new OrganizationAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        await factory.AuthenticateAsync(client, owner, "NORMAL_USER");

        var response = await client.GetAsync($"/api/organizations/{orgId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetOrganization_PlatformAdmin_ReturnsOk()
    {
        await using var factory = new OrganizationAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var admin = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        await factory.AuthenticateAsync(client, admin, "PLATFORM_ADMIN");

        var response = await client.GetAsync($"/api/organizations/{orgId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetOrganizationProjects_NonOwnerNonAdmin_ReturnsForbidden()
    {
        await using var factory = new OrganizationAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        await factory.AuthenticateAsync(client, outsider, "NORMAL_USER");

        var response = await client.GetAsync($"/api/organizations/{orgId}/projects");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetProjectDetail_NonOwnerNonAdmin_ReturnsForbidden()
    {
        await using var factory = new OrganizationAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        var projectId = await factory.SeedProjectAsync(owner, orgId);
        await factory.AuthenticateAsync(client, outsider, "NORMAL_USER");

        var response = await client.GetAsync($"/api/organizations/{orgId}/projects/{projectId}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetAllOrganizations_NormalUser_ReturnsForbidden()
    {
        await using var factory = new OrganizationAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user, "NORMAL_USER");

        var response = await client.GetAsync("/api/organizations/admin/all");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetAllOrganizations_PlatformAdmin_ReturnsOk()
    {
        await using var factory = new OrganizationAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var admin = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, admin, "PLATFORM_ADMIN");

        var response = await client.GetAsync("/api/organizations/admin/all");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetMyOrganization_Owner_ReturnsOwnOrganization()
    {
        await using var factory = new OrganizationAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        await factory.AuthenticateAsync(client, owner, "NORMAL_USER");

        var response = await client.GetAsync("/api/organizations/my");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Assert.Equal(orgId, body.GetProperty("org").GetProperty("organizationId").GetInt32());
    }

    [Fact]
    public async Task GetMyOrganization_NoOrganization_ReturnsNotFound()
    {
        await using var factory = new OrganizationAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user, "NORMAL_USER");

        var response = await client.GetAsync("/api/organizations/my");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task EvaluateProject_ForgedEvaluatorIdInBody_IsIgnoredAndActorTakenFromJwt()
    {
        await using var factory = new OrganizationAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var impersonated = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        var projectId = await factory.SeedProjectAsync(owner, orgId);
        await factory.AuthenticateAsync(client, owner, "NORMAL_USER");

        var response = await client.PostAsJsonAsync($"/api/organizations/{orgId}/projects/{projectId}/evaluate", new
        {
            evaluatorId = impersonated, // no longer a real field on the DTO — must be ignored even if sent
            overallScore = 9,
            qualityScore = 8,
            timelinessScore = 7,
            communicationScore = 9,
            comment = "Great work"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            var eval = context.ProjectEvaluations.Single(e => e.ProjectId == projectId);
            Assert.Equal(owner, eval.EvaluatorId);
            Assert.NotEqual(impersonated, eval.EvaluatorId);
        });
    }

    [Fact]
    public async Task EvaluateProject_NonOwnerNonAdmin_ReturnsForbidden()
    {
        await using var factory = new OrganizationAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        var projectId = await factory.SeedProjectAsync(owner, orgId);
        await factory.AuthenticateAsync(client, outsider, "NORMAL_USER");

        var response = await client.PostAsJsonAsync($"/api/organizations/{orgId}/projects/{projectId}/evaluate", new
        {
            overallScore = 5
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            Assert.False(context.ProjectEvaluations.Any(e => e.ProjectId == projectId));
        });
    }

    [Fact]
    public async Task EvaluateProject_ProjectBelongsToDifferentOrganization_ReturnsNotFound()
    {
        await using var factory = new OrganizationAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var ownerA = await factory.SeedUserAsync();
        var ownerB = await factory.SeedUserAsync();
        var orgA = await factory.SeedOrganizationAsync(ownerA);
        var orgB = await factory.SeedOrganizationAsync(ownerB);
        var projectInOrgB = await factory.SeedProjectAsync(ownerB, orgB);
        await factory.AuthenticateAsync(client, ownerA, "NORMAL_USER");

        // ownerA owns orgA and tries to evaluate a project that actually belongs to orgB by
        // mixing IDs across the route.
        var response = await client.PostAsJsonAsync($"/api/organizations/{orgA}/projects/{projectInOrgB}/evaluate", new
        {
            overallScore = 5
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetProjectEvaluation_NonOwnerNonAdmin_ReturnsForbidden()
    {
        await using var factory = new OrganizationAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var orgId = await factory.SeedOrganizationAsync(owner);
        var projectId = await factory.SeedProjectAsync(owner, orgId);
        await factory.AuthenticateAsync(client, outsider, "NORMAL_USER");

        var response = await client.GetAsync($"/api/organizations/{orgId}/projects/{projectId}/evaluation");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}

public sealed class OrganizationAuthorizationApiFactory : WebApplicationFactory<Program>
{
    private const string TestJwtSecret = "taskgenie-org-authorization-test-secret-32c";
    private readonly string _databaseName = $"taskgenie-org-auth-{Guid.NewGuid()}";

    public OrganizationAuthorizationApiFactory()
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
        var user = User.Create($"User {Guid.NewGuid():N}", $"user-{Guid.NewGuid():N}@orgs.test", "hash");
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user.UserId;
    }

    public async Task<int> SeedOrganizationAsync(int ownerId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var org = Organization.Create($"Org {Guid.NewGuid():N}", null, ownerId);
        context.Organizations.Add(org);
        await context.SaveChangesAsync();
        return org.OrganizationId;
    }

    public async Task<int> SeedProjectAsync(int createdBy, int organizationId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var project = Project.Create($"Project {Guid.NewGuid():N}", null, createdBy, organizationId);
        context.Projects.Add(project);
        await context.SaveChangesAsync();
        return project.ProjectId;
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

    public async Task WithDbAsync(Action<AppDbContext> assertion)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        assertion(context);
        await Task.CompletedTask;
    }
}
