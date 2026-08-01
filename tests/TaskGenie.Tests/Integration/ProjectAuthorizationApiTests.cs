using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using TaskGenie.Application.Features.Projects.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Tests.Integration;

public sealed class ProjectAuthorizationApiTests
{
    [Fact]
    public async Task GetById_NonMemberNonOwner_ReturnsForbidden()
    {
        await using var factory = new ProjectAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var project = await factory.SeedProjectAsync(owner);
        await factory.AuthenticateAsync(client, outsider);

        var response = await client.GetAsync($"/api/projects/{project.ProjectId}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetById_Owner_ReturnsOk()
    {
        await using var factory = new ProjectAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var project = await factory.SeedProjectAsync(owner);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.GetAsync($"/api/projects/{project.ProjectId}");
        var payload = await response.Content.ReadFromJsonAsync<ProjectDto>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(project.ProjectId, payload!.ProjectId);
    }

    [Fact]
    public async Task GetById_TeamMember_ReturnsOk()
    {
        await using var factory = new ProjectAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var project = await factory.SeedProjectAsync(owner, teamMemberUserIds: [member]);
        await factory.AuthenticateAsync(client, member);

        var response = await client.GetAsync($"/api/projects/{project.ProjectId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetById_PlatformAdmin_BypassesOwnership()
    {
        await using var factory = new ProjectAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var admin = await factory.SeedUserAsync();
        var project = await factory.SeedProjectAsync(owner);
        await factory.AuthenticateAsync(client, admin, role: "PLATFORM_ADMIN");

        var response = await client.GetAsync($"/api/projects/{project.ProjectId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetById_NonExistentProject_ReturnsNotFound()
    {
        await using var factory = new ProjectAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user);

        var response = await client.GetAsync("/api/projects/999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Update_NonOwnerTeamMember_ReturnsForbidden()
    {
        // A plain team member can read the project but not manage it (rename/status/etc).
        await using var factory = new ProjectAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var project = await factory.SeedProjectAsync(owner, teamMemberUserIds: [member]);
        await factory.AuthenticateAsync(client, member);

        var response = await client.PutAsJsonAsync($"/api/projects/{project.ProjectId}", new
        {
            name = "Renamed by non-owner",
            description = (string?)null,
            status = (string?)null,
            teamId = (int?)null,
            deadline = (DateOnly?)null
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Update_Owner_ReturnsNoContentAndPersists()
    {
        await using var factory = new ProjectAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var project = await factory.SeedProjectAsync(owner);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PutAsJsonAsync($"/api/projects/{project.ProjectId}", new
        {
            name = "Renamed by owner",
            description = (string?)null,
            status = (string?)null,
            teamId = (int?)null,
            deadline = (DateOnly?)null
        });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            var updated = context.Projects.Single(p => p.ProjectId == project.ProjectId);
            Assert.Equal("Renamed by owner", updated.Name);
        });
    }

    [Fact]
    public async Task Delete_NonOwner_ReturnsForbiddenAndDoesNotDelete()
    {
        await using var factory = new ProjectAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var project = await factory.SeedProjectAsync(owner);
        await factory.AuthenticateAsync(client, outsider);

        var response = await client.DeleteAsync($"/api/projects/{project.ProjectId}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            Assert.True(context.Projects.Any(p => p.ProjectId == project.ProjectId));
        });
    }

    [Fact]
    public async Task Delete_Owner_ReturnsNoContent()
    {
        await using var factory = new ProjectAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var project = await factory.SeedProjectAsync(owner);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.DeleteAsync($"/api/projects/{project.ProjectId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Create_ActorIsAlwaysFromJwt_NotFromRequestBody()
    {
        await using var factory = new ProjectAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var actualActor = await factory.SeedUserAsync();
        var impersonated = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, actualActor);

        var response = await client.PostAsJsonAsync("/api/projects", new
        {
            name = "New project",
            description = (string?)null,
            organizationId = (int?)null,
            deadline = (DateOnly?)null
        });
        var payload = await response.Content.ReadFromJsonAsync<ProjectDto>();

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(actualActor, payload!.CreatedBy);
        Assert.NotEqual(impersonated, payload.CreatedBy);
    }

    [Fact]
    public async Task OrganizationOwner_CanAccessAndManageOrgProject_WithoutBeingCreatorOrMember()
    {
        await using var factory = new ProjectAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var orgOwner = await factory.SeedUserAsync();
        var creator = await factory.SeedUserAsync();
        var organizationId = await factory.SeedOrganizationAsync(orgOwner);
        var project = await factory.SeedProjectAsync(creator, organizationId: organizationId);
        await factory.AuthenticateAsync(client, orgOwner);

        var getResponse = await client.GetAsync($"/api/projects/{project.ProjectId}");
        var closeResponse = await client.PostAsync($"/api/projects/{project.ProjectId}/close", null);

        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, closeResponse.StatusCode);
    }

    [Fact]
    public async Task Outsider_GetSummary_ReturnsForbidden()
    {
        await using var factory = new ProjectAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var project = await factory.SeedProjectAsync(owner);
        await factory.AuthenticateAsync(client, outsider);

        var response = await client.GetAsync($"/api/projects/{project.ProjectId}/summary");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Outsider_Close_ReturnsForbidden()
    {
        await using var factory = new ProjectAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var project = await factory.SeedProjectAsync(owner);
        await factory.AuthenticateAsync(client, outsider);

        var response = await client.PostAsync($"/api/projects/{project.ProjectId}/close", null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Outsider_AddMember_ReturnsForbidden()
    {
        await using var factory = new ProjectAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var project = await factory.SeedProjectAsync(owner);
        var invitee = await factory.SeedUserAsync();
        var inviteeEmail = await factory.GetUserEmailAsync(invitee);
        await factory.AuthenticateAsync(client, outsider);

        var response = await client.PostAsJsonAsync($"/api/projects/{project.ProjectId}/members", new
        {
            email = inviteeEmail,
            role = "MEMBER"
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Owner_AddMember_SucceedsAndNewTeamIsOwnedByActor_NotInvitee()
    {
        await using var factory = new ProjectAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var project = await factory.SeedProjectAsync(owner); // no team yet
        var invitee = await factory.SeedUserAsync();
        var inviteeEmail = await factory.GetUserEmailAsync(invitee);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PostAsJsonAsync($"/api/projects/{project.ProjectId}/members", new
        {
            email = inviteeEmail,
            role = "MEMBER"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            var updatedProject = context.Projects.Single(p => p.ProjectId == project.ProjectId);
            Assert.NotNull(updatedProject.TeamId);

            var team = context.Teams.Single(t => t.TeamId == updatedProject.TeamId);
            Assert.Equal(owner, team.CreatedBy);
            Assert.NotEqual(invitee, team.CreatedBy);

            var member = context.TeamMembers.Single(m => m.TeamId == team.TeamId && m.UserId == invitee);
            Assert.Equal("MEMBER", member.Role);
        });
    }

    [Fact]
    public async Task AddMember_InvalidRole_ReturnsBadRequest()
    {
        await using var factory = new ProjectAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var project = await factory.SeedProjectAsync(owner);
        var invitee = await factory.SeedUserAsync();
        var inviteeEmail = await factory.GetUserEmailAsync(invitee);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PostAsJsonAsync($"/api/projects/{project.ProjectId}/members", new
        {
            email = inviteeEmail,
            role = "SUPERUSER"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddMember_UnknownEmail_ReturnsNotFound()
    {
        await using var factory = new ProjectAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var project = await factory.SeedProjectAsync(owner);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PostAsJsonAsync($"/api/projects/{project.ProjectId}/members", new
        {
            email = $"no-such-user-{Guid.NewGuid():N}@authz.test",
            role = "MEMBER"
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Create_WithOrganizationId_NonOwnerNonAdmin_ReturnsForbidden()
    {
        await using var factory = new ProjectAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var orgOwner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var organizationId = await factory.SeedOrganizationAsync(orgOwner);
        await factory.AuthenticateAsync(client, outsider);

        var response = await client.PostAsJsonAsync("/api/projects", new
        {
            name = "Spoofed org project",
            description = (string?)null,
            organizationId,
            deadline = (DateOnly?)null
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Create_WithNonExistentOrganizationId_ReturnsNotFound()
    {
        await using var factory = new ProjectAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user);

        var response = await client.PostAsJsonAsync("/api/projects", new
        {
            name = "Project under missing org",
            description = (string?)null,
            organizationId = 999999,
            deadline = (DateOnly?)null
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Create_WithOrganizationId_OrgOwner_Succeeds()
    {
        await using var factory = new ProjectAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var orgOwner = await factory.SeedUserAsync();
        var organizationId = await factory.SeedOrganizationAsync(orgOwner);
        await factory.AuthenticateAsync(client, orgOwner);

        var response = await client.PostAsJsonAsync("/api/projects", new
        {
            name = "Legit org project",
            description = (string?)null,
            organizationId,
            deadline = (DateOnly?)null
        });
        var payload = await response.Content.ReadFromJsonAsync<ProjectDto>();

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(organizationId, payload!.OrganizationId);
    }

    [Fact]
    public async Task Create_WithOrganizationId_PlatformAdmin_Succeeds()
    {
        await using var factory = new ProjectAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var orgOwner = await factory.SeedUserAsync();
        var admin = await factory.SeedUserAsync();
        var organizationId = await factory.SeedOrganizationAsync(orgOwner);
        await factory.AuthenticateAsync(client, admin, role: "PLATFORM_ADMIN");

        var response = await client.PostAsJsonAsync("/api/projects", new
        {
            name = "Admin-created org project",
            description = (string?)null,
            organizationId,
            deadline = (DateOnly?)null
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Update_KeepingCurrentTeamId_DoesNotRequireTeamOwnership()
    {
        await using var factory = new ProjectAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var project = await factory.SeedProjectAsync(owner, teamMemberUserIds: [owner]);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PutAsJsonAsync($"/api/projects/{project.ProjectId}", new
        {
            name = "Same team, just renaming",
            description = (string?)null,
            status = (string?)null,
            teamId = project.TeamId,
            deadline = (DateOnly?)null
        });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Update_ChangingTeamId_ToTeamNotOwnedByActor_ReturnsForbidden()
    {
        await using var factory = new ProjectAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var someoneElse = await factory.SeedUserAsync();
        var project = await factory.SeedProjectAsync(owner);
        var otherTeamId = await factory.SeedStandaloneTeamAsync(someoneElse);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PutAsJsonAsync($"/api/projects/{project.ProjectId}", new
        {
            name = (string?)null,
            description = (string?)null,
            status = (string?)null,
            teamId = otherTeamId,
            deadline = (DateOnly?)null
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Update_ChangingTeamId_ToNonExistentTeam_ReturnsNotFound()
    {
        await using var factory = new ProjectAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var project = await factory.SeedProjectAsync(owner);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PutAsJsonAsync($"/api/projects/{project.ProjectId}", new
        {
            name = (string?)null,
            description = (string?)null,
            status = (string?)null,
            teamId = 999999,
            deadline = (DateOnly?)null
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Update_ChangingTeamId_ToTeamOwnedByActor_Succeeds()
    {
        await using var factory = new ProjectAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var project = await factory.SeedProjectAsync(owner);
        var ownTeamId = await factory.SeedStandaloneTeamAsync(owner);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PutAsJsonAsync($"/api/projects/{project.ProjectId}", new
        {
            name = (string?)null,
            description = (string?)null,
            status = (string?)null,
            teamId = ownTeamId,
            deadline = (DateOnly?)null
        });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            var updated = context.Projects.Single(p => p.ProjectId == project.ProjectId);
            Assert.Equal(ownTeamId, updated.TeamId);
        });
    }

    [Fact]
    public async Task Update_ChangingTeamId_PlatformAdmin_CanAssignAnyTeam()
    {
        await using var factory = new ProjectAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var admin = await factory.SeedUserAsync();
        var someoneElse = await factory.SeedUserAsync();
        var project = await factory.SeedProjectAsync(owner);
        var otherTeamId = await factory.SeedStandaloneTeamAsync(someoneElse);
        await factory.AuthenticateAsync(client, admin, role: "PLATFORM_ADMIN");

        var response = await client.PutAsJsonAsync($"/api/projects/{project.ProjectId}", new
        {
            name = (string?)null,
            description = (string?)null,
            status = (string?)null,
            teamId = otherTeamId,
            deadline = (DateOnly?)null
        });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }
}

public sealed class ProjectAuthorizationApiFactory : WebApplicationFactory<Program>
{
    private const string TestJwtSecret = "taskgenie-project-authz-test-secret-32chars";
    private readonly string _databaseName = $"taskgenie-project-authz-{Guid.NewGuid()}";
    private int _nextUserId = 1;

    public ProjectAuthorizationApiFactory()
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
        var id = _nextUserId++;
        var user = User.Create($"User {id}", $"user{id}-{Guid.NewGuid():N}@authz.test", "hash");
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user.UserId;
    }

    public async Task<string> GetUserEmailAsync(int userId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await context.Users.SingleAsync(item => item.UserId == userId);
        return user.Email;
    }

    public async Task<int> SeedStandaloneTeamAsync(int createdBy)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var team = Team.Create($"Standalone team {Guid.NewGuid():N}", null, createdBy);
        context.Teams.Add(team);
        await context.SaveChangesAsync();
        return team.TeamId;
    }

    public async Task<int> SeedOrganizationAsync(int ownerUserId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var org = Organization.Create($"Org {Guid.NewGuid():N}", null, ownerUserId);
        context.Organizations.Add(org);
        await context.SaveChangesAsync();

        // Real organization creation (CreateOrganizationCommand -> OrganizationLifecycleService)
        // always creates the OWNER's OrganizationMember row atomically alongside the
        // Organization — mirror that here so this seed matches production data shape.
        var ownerMembership = OrganizationMember.Create(org.OrganizationId, ownerUserId, OrganizationRole.Owner);
        context.OrganizationMembers.Add(ownerMembership);
        await context.SaveChangesAsync();

        return org.OrganizationId;
    }

    public async Task<Project> SeedProjectAsync(int createdBy, int[]? teamMemberUserIds = null, int? organizationId = null)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var project = Project.Create($"Project {Guid.NewGuid():N}", null, createdBy, organizationId);
        context.Projects.Add(project);
        await context.SaveChangesAsync();

        if (teamMemberUserIds is { Length: > 0 })
        {
            var team = Team.Create($"Team for {project.Name}", null, createdBy);
            context.Teams.Add(team);
            await context.SaveChangesAsync();

            foreach (var memberUserId in teamMemberUserIds)
                context.TeamMembers.Add(TeamMember.Create(team.TeamId, memberUserId, "MEMBER"));

            project.SetTeamId(team.TeamId);
            await context.SaveChangesAsync();
        }

        return project;
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
