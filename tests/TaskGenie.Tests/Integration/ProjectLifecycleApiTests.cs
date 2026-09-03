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

    /// <summary>
    /// Regression guard for a bug found in real UAT: PUT /working-hours persisted correctly, but
    /// GetProjectByIdQuery's response never carried the field back — ProjectDto simply had no
    /// property for it — so the saved value was invisible on every reload and the UI kept showing
    /// the fallback default forever, looking exactly like the save silently failed.
    /// </summary>
    [Fact]
    public async Task SetWorkingHours_PersistsAndIsReturnedByGetProject()
    {
        await using var factory = new ProjectLifecycleApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (project, _) = await factory.SeedProjectWithDedicatedTeamAsync(owner);
        await factory.AuthenticateAsync(client, owner);

        var put = await client.PutAsJsonAsync($"/api/projects/{project.ProjectId}/working-hours", new { workingHoursPerDay = 6 });
        Assert.Equal(HttpStatusCode.OK, put.StatusCode);

        var get = await client.GetAsync($"/api/projects/{project.ProjectId}");
        var payload = await get.Content.ReadFromJsonAsync<ProjectDto>();

        Assert.Equal(HttpStatusCode.OK, get.StatusCode);
        Assert.Equal(6, payload!.WorkingHoursPerDay);
    }

    /// <summary>
    /// Delete is now a 30-day-grace soft-delete, not an immediate hard delete: the project must
    /// disappear from every list and free its quota slot right away, while every row underneath it
    /// (the project itself included) stays intact until the purge worker's grace period elapses.
    /// </summary>
    [Fact]
    public async Task Delete_SoftDeletes_HidesImmediatelyButKeepsTheRowAndFreesQuota()
    {
        await using var factory = new ProjectLifecycleApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (project, _) = await factory.SeedProjectWithDedicatedTeamAsync(owner);
        await factory.AuthenticateAsync(client, owner);

        var beforeEntitlement = await client.GetFromJsonAsync<EffectiveEntitlement>("/api/billing/entitlement");
        Assert.Equal(1, beforeEntitlement!.ProjectUsage);

        var response = await client.DeleteAsync($"/api/projects/{project.ProjectId}");
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        // Hidden from the active list immediately.
        var active = await client.GetFromJsonAsync<List<ProjectDto>>("/api/projects");
        Assert.DoesNotContain(active!, p => p.ProjectId == project.ProjectId);

        // Also hidden from the closed list — a deleted project is not a finished one either.
        var closed = await client.GetFromJsonAsync<List<ProjectDto>>("/api/projects?closed=true");
        Assert.DoesNotContain(closed!, p => p.ProjectId == project.ProjectId);

        // Quota freed right away — no need to wait for the purge.
        var afterEntitlement = await client.GetFromJsonAsync<EffectiveEntitlement>("/api/billing/entitlement");
        Assert.Equal(0, afterEntitlement!.ProjectUsage);

        // But nothing was actually destroyed yet.
        await factory.WithDbAsync(context =>
        {
            var row = context.Projects.Single(p => p.ProjectId == project.ProjectId);
            Assert.Equal(Project.DeletedStatus, row.Status);
            Assert.True(row.IsDeleted);
        });
    }

    /// <summary>A soft-deleted project is visible in exactly one place — the Trash view — for as
    /// long as it's within its grace period, and nowhere else.</summary>
    [Fact]
    public async Task Delete_MakesTheProjectVisibleOnlyInTheTrashView()
    {
        await using var factory = new ProjectLifecycleApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (project, _) = await factory.SeedProjectWithDedicatedTeamAsync(owner);
        await factory.AuthenticateAsync(client, owner);

        await client.DeleteAsync($"/api/projects/{project.ProjectId}");

        var trash = await client.GetFromJsonAsync<List<ProjectDto>>("/api/projects?deleted=true");
        var row = Assert.Single(trash!, p => p.ProjectId == project.ProjectId);
        Assert.Equal("Deleted", row.Status);
    }

    /// <summary>
    /// Restore is the whole point of the grace period: the project must come back to life exactly
    /// as if it had never been deleted — visible again, its quota slot reclaimed, and gone from the
    /// Trash view once it's no longer sitting in it.
    /// </summary>
    [Fact]
    public async Task Restore_BringsTheProjectBackAndReclaimsItsQuotaSlot()
    {
        await using var factory = new ProjectLifecycleApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (project, _) = await factory.SeedProjectWithDedicatedTeamAsync(owner);
        await factory.AuthenticateAsync(client, owner);

        await client.DeleteAsync($"/api/projects/{project.ProjectId}");
        var whileDeleted = await client.GetFromJsonAsync<EffectiveEntitlement>("/api/billing/entitlement");
        Assert.Equal(0, whileDeleted!.ProjectUsage);

        var restoreResponse = await client.PostAsync($"/api/projects/{project.ProjectId}/restore", null);
        Assert.Equal(HttpStatusCode.NoContent, restoreResponse.StatusCode);

        var active = await client.GetFromJsonAsync<List<ProjectDto>>("/api/projects");
        var row = Assert.Single(active!, p => p.ProjectId == project.ProjectId);
        Assert.Equal("Planning", row.Status);

        var trash = await client.GetFromJsonAsync<List<ProjectDto>>("/api/projects?deleted=true");
        Assert.DoesNotContain(trash!, p => p.ProjectId == project.ProjectId);

        var afterRestore = await client.GetFromJsonAsync<EffectiveEntitlement>("/api/billing/entitlement");
        Assert.Equal(1, afterRestore!.ProjectUsage);
    }

    [Fact]
    public async Task Restore_IsRefusedToSomeoneWhoDoesNotManageTheProject()
    {
        await using var factory = new ProjectLifecycleApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var (project, _) = await factory.SeedProjectWithDedicatedTeamAsync(owner);
        await factory.AuthenticateAsync(client, owner);
        await client.DeleteAsync($"/api/projects/{project.ProjectId}");

        await factory.AuthenticateAsync(client, outsider);
        var response = await client.PostAsync($"/api/projects/{project.ProjectId}/restore", null);

        Assert.True(
            response.StatusCode is HttpStatusCode.Forbidden or HttpStatusCode.NotFound,
            $"Expected 403 or 404 for a non-manager, got {(int)response.StatusCode}.");
        await factory.WithDbAsync(context =>
            Assert.True(context.Projects.Single(p => p.ProjectId == project.ProjectId).IsDeleted));
    }

    /// <summary>
    /// The user-facing DELETE endpoint only soft-deletes now (see
    /// Delete_SoftDeletes_HidesImmediatelyButKeepsTheRowAndFreesQuota) — the cascading hard-delete
    /// these three tests exercise is what the purge worker runs once the grace period elapses, via
    /// IProjectLifecycleService.DeleteProjectAsync directly. That is exactly what these test: the
    /// cascade/orphan-cleanup logic itself is unchanged, only who calls it and when.
    /// </summary>
    [Fact]
    public async Task HardDelete_CleansUpDedicatedTeamMembersAndInvitations_NoOrphans()
    {
        await using var factory = new ProjectLifecycleApiFactory();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var (project, teamId) = await factory.SeedProjectWithDedicatedTeamAsync(owner, extraMemberUserIds: [member]);
        await factory.SeedInvitationAsync(teamId, "invitee@authz.test");

        await factory.HardDeleteProjectAsync(project);

        await factory.WithDbAsync(context =>
        {
            Assert.False(context.Projects.Any(p => p.ProjectId == project.ProjectId));
            Assert.False(context.Teams.Any(t => t.TeamId == teamId));
            Assert.False(context.TeamMembers.Any(m => m.TeamId == teamId));
            Assert.False(context.Invitations.Any(i => i.TeamId == teamId));
        });
    }

    [Fact]
    public async Task HardDelete_DoesNotDeleteStandaloneTeam()
    {
        await using var factory = new ProjectLifecycleApiFactory();
        var owner = await factory.SeedUserAsync();
        // A team created independently (e.g. via TeamsController.Create) is never IsProjectManaged.
        var teamId = await factory.SeedStandaloneTeamAsync(owner);
        var project = await factory.SeedProjectOnExistingTeamAsync(owner, teamId);

        await factory.HardDeleteProjectAsync(project);

        await factory.WithDbAsync(context =>
        {
            Assert.False(context.Projects.Any(p => p.ProjectId == project.ProjectId));
            Assert.True(context.Teams.Any(t => t.TeamId == teamId));
        });
    }

    [Fact]
    public async Task HardDelete_DoesNotDeleteDedicatedTeamStillReferencedByAnotherProject()
    {
        await using var factory = new ProjectLifecycleApiFactory();
        var owner = await factory.SeedUserAsync();
        var (firstProject, teamId) = await factory.SeedProjectWithDedicatedTeamAsync(owner);
        // A second project shares the same (still IsProjectManaged) team.
        var secondProject = await factory.SeedProjectOnExistingTeamAsync(owner, teamId);

        await factory.HardDeleteProjectAsync(firstProject);

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

    /// <summary>
    /// A task inside the project with one row in each of the tables that used to survive a project
    /// delete. Returns the task id so a test can assert every child is gone.
    /// </summary>
    public async Task<int> SeedTaskWithChildrenAsync(int projectId, int userId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var task = TaskGenie.Domain.Entities.Task.Create(projectId, $"Task {Guid.NewGuid():N}", null, createdBy: userId);
        context.Tasks.Add(task);
        var blocker = TaskGenie.Domain.Entities.Task.Create(projectId, $"Blocker {Guid.NewGuid():N}", null, createdBy: userId);
        context.Tasks.Add(blocker);
        await context.SaveChangesAsync();

        context.TaskAssignees.Add(TaskAssignee.Create(task.TaskId, userId));
        context.TaskComments.Add(TaskComment.Create(task.TaskId, userId, "comment", null));
        context.TaskLogs.Add(TaskLog.Create(task.TaskId, 10, "note", "LOW"));
        context.TaskDependencies.Add(TaskDependency.Create(task.TaskId, blocker.TaskId));
        context.UserScores.Add(UserScore.CreateReward(userId, 5, "task score", taskId: task.TaskId));
        context.UserScores.Add(UserScore.CreateReward(userId, 7, "project score", projectId: projectId));
        context.ActivityLogs.Add(ActivityLog.Create(userId, "TASK_CREATED", "TASK", task.TaskId));
        await context.SaveChangesAsync();

        return task.TaskId;
    }

    /// <summary>An organization, optionally with an ACTIVE paid subscription.</summary>
    public async Task<int> SeedOrganizationAsync(int ownerId, bool activeSubscription)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();

        var organization = Organization.Create($"Org {Guid.NewGuid():N}", null, ownerId);
        context.Organizations.Add(organization);
        await context.SaveChangesAsync();

        if (activeSubscription)
        {
            var plan = Plan.Create(
                $"PRO_ORG_{Guid.NewGuid():N}", "Organization Pro", "ORGANIZATION", "MONTHLY",
                priceMinor: 1_199_000, currency: "VND", projectLimit: null, memberLimit: null,
                sortOrder: 0, aiChatbotEnabled: true);
            context.Plans.Add(plan);
            await context.SaveChangesAsync();

            var subscription = Subscription.CreateForOrganization(plan.PlanId, organization.OrganizationId);
            subscription.Activate(DateTime.UtcNow.AddDays(30));
            context.Subscriptions.Add(subscription);
            await context.SaveChangesAsync();
        }

        return organization.OrganizationId;
    }

    public async Task<int> SeedOrganizationProjectAsync(int createdBy, int organizationId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var project = Project.Create($"Org project {Guid.NewGuid():N}", null, createdBy, organizationId);
        context.Projects.Add(project);
        await context.SaveChangesAsync();
        return project.ProjectId;
    }

    /// <summary>Ends the organization's paid period, exactly as the lifecycle sweep would.</summary>
    public async Task ExpireOrganizationSubscriptionAsync(int organizationId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var subscription = await context.Subscriptions.SingleAsync(s => s.OrganizationId == organizationId);
        subscription.Expire();
        await context.SaveChangesAsync();
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

    /// <summary>Drives the cascading hard-delete directly — what the purge worker calls once a
    /// soft-deleted project's grace period elapses. Bypasses the HTTP endpoint, which only
    /// soft-deletes, so these tests can still exercise the cascade/orphan-cleanup logic itself.</summary>
    public async Task HardDeleteProjectAsync(Project project)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var lifecycle = scope.ServiceProvider.GetRequiredService<IProjectLifecycleService>();
        var tracked = await context.Projects.SingleAsync(p => p.ProjectId == project.ProjectId);
        await lifecycle.DeleteProjectAsync(tracked);
    }
}
