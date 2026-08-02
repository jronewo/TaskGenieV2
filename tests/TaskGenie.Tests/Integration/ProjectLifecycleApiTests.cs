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

/// <summary>
/// Covers the Project/Team lifecycle defect found in real SQL Server UAT: deleting (or
/// reassigning away from) a project's auto-created dedicated team must not leave orphaned
/// Team/TeamMember/Invitation rows, and must never touch a standalone/shared team.
/// </summary>
public sealed class ProjectLifecycleApiTests
{
    [Fact]
    public async Task Create_CreatesDedicatedTeamAndLeaderMembershipAtomically()
    {
        await using var factory = new ProjectLifecycleApiFactory();
        using var client = factory.CreateClient();
        var actor = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, actor);

        var response = await client.PostAsJsonAsync("/api/projects", new
        {
            name = "Atomic create",
            description = (string?)null,
            organizationId = (int?)null,
            deadline = (DateOnly?)null
        });
        var payload = await response.Content.ReadFromJsonAsync<ProjectDto>();

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            var project = context.Projects.Single(p => p.ProjectId == payload!.ProjectId);
            Assert.NotNull(project.TeamId);

            var team = context.Teams.Single(t => t.TeamId == project.TeamId);
            Assert.True(team.IsProjectManaged);
            Assert.Equal(actor, team.CreatedBy);

            var leaderMembership = context.TeamMembers.Single(m => m.TeamId == team.TeamId && m.UserId == actor);
            Assert.Equal("LEADER", leaderMembership.Role);
        });
    }

    [Fact]
    public async Task Delete_CleansUpDedicatedTeamMembersAndInvitations_NoOrphans()
    {
        await using var factory = new ProjectLifecycleApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var (project, teamId) = await factory.SeedProjectWithDedicatedTeamAsync(owner, extraMemberUserIds: [member]);
        await factory.SeedInvitationAsync(teamId, "invitee@authz.test");
        await factory.AuthenticateAsync(client, owner);

        var response = await client.DeleteAsync($"/api/projects/{project.ProjectId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            Assert.False(context.Projects.Any(p => p.ProjectId == project.ProjectId));
            Assert.False(context.Teams.Any(t => t.TeamId == teamId));
            Assert.False(context.TeamMembers.Any(m => m.TeamId == teamId));
            Assert.False(context.Invitations.Any(i => i.TeamId == teamId));
        });
    }

    [Fact]
    public async Task Delete_DoesNotDeleteStandaloneTeam()
    {
        await using var factory = new ProjectLifecycleApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        // A team created independently (e.g. via TeamsController.Create) is never IsProjectManaged.
        var teamId = await factory.SeedStandaloneTeamAsync(owner);
        var project = await factory.SeedProjectOnExistingTeamAsync(owner, teamId);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.DeleteAsync($"/api/projects/{project.ProjectId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            Assert.False(context.Projects.Any(p => p.ProjectId == project.ProjectId));
            Assert.True(context.Teams.Any(t => t.TeamId == teamId));
        });
    }

    [Fact]
    public async Task Delete_DoesNotDeleteDedicatedTeamStillReferencedByAnotherProject()
    {
        await using var factory = new ProjectLifecycleApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (firstProject, teamId) = await factory.SeedProjectWithDedicatedTeamAsync(owner);
        // A second project shares the same (still IsProjectManaged) team.
        var secondProject = await factory.SeedProjectOnExistingTeamAsync(owner, teamId);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.DeleteAsync($"/api/projects/{firstProject.ProjectId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            Assert.False(context.Projects.Any(p => p.ProjectId == firstProject.ProjectId));
            Assert.True(context.Projects.Any(p => p.ProjectId == secondProject.ProjectId));
            Assert.True(context.Teams.Any(t => t.TeamId == teamId));
        });
    }

    [Fact]
    public async Task Update_ReassignAwayFromDedicatedTeam_CleansUpOldTeam()
    {
        await using var factory = new ProjectLifecycleApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (project, oldTeamId) = await factory.SeedProjectWithDedicatedTeamAsync(owner);
        var newTeamId = await factory.SeedStandaloneTeamAsync(owner);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PutAsJsonAsync($"/api/projects/{project.ProjectId}", new
        {
            name = (string?)null,
            description = (string?)null,
            status = (string?)null,
            teamId = newTeamId,
            deadline = (DateOnly?)null
        });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            var updated = context.Projects.Single(p => p.ProjectId == project.ProjectId);
            Assert.Equal(newTeamId, updated.TeamId);

            Assert.False(context.Teams.Any(t => t.TeamId == oldTeamId));
            Assert.False(context.TeamMembers.Any(m => m.TeamId == oldTeamId));
            Assert.True(context.Teams.Any(t => t.TeamId == newTeamId));
        });
    }

    [Fact]
    public async Task Update_ReassignAwayFromStandaloneTeam_DoesNotDeleteIt()
    {
        await using var factory = new ProjectLifecycleApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var standaloneTeamId = await factory.SeedStandaloneTeamAsync(owner);
        var project = await factory.SeedProjectOnExistingTeamAsync(owner, standaloneTeamId);
        var newTeamId = await factory.SeedStandaloneTeamAsync(owner);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PutAsJsonAsync($"/api/projects/{project.ProjectId}", new
        {
            name = (string?)null,
            description = (string?)null,
            status = (string?)null,
            teamId = newTeamId,
            deadline = (DateOnly?)null
        });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            Assert.True(context.Teams.Any(t => t.TeamId == standaloneTeamId));
        });
    }
}

public sealed class ProjectLifecycleApiFactory : WebApplicationFactory<Program>
{
    private const string TestJwtSecret = "taskgenie-project-lifecycle-test-secret-32c";
    private readonly string _databaseName = $"taskgenie-project-lifecycle-{Guid.NewGuid()}";

    public ProjectLifecycleApiFactory()
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
        var user = User.Create($"User {Guid.NewGuid():N}", $"user-{Guid.NewGuid():N}@lifecycle.test", "hash");
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user.UserId;
    }

    /// <summary>Mirrors what CreateProjectWithDedicatedTeamAsync produces: a Team with
    /// IsProjectManaged=true, an initial LEADER TeamMember, and the Project pointing at it.</summary>
    public async Task<(Project Project, int TeamId)> SeedProjectWithDedicatedTeamAsync(int owner, int[]? extraMemberUserIds = null)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var team = Team.Create($"Dedicated team {Guid.NewGuid():N}", null, owner, isProjectManaged: true);
        context.Teams.Add(team);
        await context.SaveChangesAsync();

        context.TeamMembers.Add(TeamMember.Create(team.TeamId, owner, "LEADER"));
        foreach (var memberId in extraMemberUserIds ?? [])
            context.TeamMembers.Add(TeamMember.Create(team.TeamId, memberId, "MEMBER"));
        await context.SaveChangesAsync();

        var project = Project.Create($"Project {Guid.NewGuid():N}", null, owner);
        project.SetTeamId(team.TeamId);
        context.Projects.Add(project);
        await context.SaveChangesAsync();

        return (project, team.TeamId);
    }

    /// <summary>A team created independently of any project flow — e.g. via TeamsController.Create
    /// — is never IsProjectManaged and must never be auto-deleted.</summary>
    public async Task<int> SeedStandaloneTeamAsync(int createdBy)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var team = Team.Create($"Standalone team {Guid.NewGuid():N}", null, createdBy);
        context.Teams.Add(team);
        await context.SaveChangesAsync();
        return team.TeamId;
    }

    public async Task<Project> SeedProjectOnExistingTeamAsync(int createdBy, int teamId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var project = Project.Create($"Project {Guid.NewGuid():N}", null, createdBy);
        project.SetTeamId(teamId);
        context.Projects.Add(project);
        await context.SaveChangesAsync();
        return project;
    }

    public async Task SeedInvitationAsync(int teamId, string email)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        context.Invitations.Add(Invitation.Create(teamId, email));
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
