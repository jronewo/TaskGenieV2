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

/// <summary>Regression tests for the eight controllers audited in Slice 0. Each test reproduces a
/// defect that was live before the fix: missing ownership checks (IDOR) and actor identity taken
/// from the request body instead of the JWT.</summary>
public sealed class SliceZeroAuthorizationApiTests
{
    // ── UserScores: privilege escalation ─────────────────────────────────────────────

    [Fact]
    public async Task ApplyManualScore_UserAwardingThemselves_IsRejected()
    {
        await using var factory = new SliceZeroApiFactory();
        using var client = factory.CreateClient();
        var attacker = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, attacker);

        var response = await client.PostAsJsonAsync("/api/user-scores/manual", new
        {
            userId = attacker, type = "REWARD", amount = 9999, reason = "self-granted"
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        await factory.WithDbAsync(db => Assert.False(db.UserScores.Any(s => s.UserId == attacker)));
    }

    [Fact]
    public async Task ApplyManualScore_NonLeaderScoringSomeoneElse_IsRejected()
    {
        await using var factory = new SliceZeroApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var attacker = await factory.SeedUserAsync();
        var victim = await factory.SeedUserAsync();
        var projectId = await factory.SeedProjectAsync(owner);
        await factory.AuthenticateAsync(client, attacker);

        var response = await client.PostAsJsonAsync("/api/user-scores/manual", new
        {
            userId = victim, type = "PENALTY", amount = 500, reason = "sabotage", projectId
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        await factory.WithDbAsync(db => Assert.False(db.UserScores.Any()));
    }

    [Fact]
    public async Task GetUserScoreHistory_OtherUser_IsRejected()
    {
        await using var factory = new SliceZeroApiFactory();
        using var client = factory.CreateClient();
        var victim = await factory.SeedUserAsync();
        var attacker = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, attacker);

        var response = await client.GetAsync($"/api/user-scores/user/{victim}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ── Users: identity endpoints act on the caller only ─────────────────────────────

    [Fact]
    public async Task UpdateProfile_AlwaysAppliesToJwtActor()
    {
        await using var factory = new SliceZeroApiFactory();
        using var client = factory.CreateClient();
        var actor = await factory.SeedUserAsync();
        var victim = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, actor);

        var response = await client.PutAsJsonAsync("/api/users/me/profile", new { name = "Renamed", avatar = (string?)null });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await factory.WithDbAsync(db =>
        {
            Assert.Equal("Renamed", db.Users.Single(u => u.UserId == actor).Name);
            Assert.NotEqual("Renamed", db.Users.Single(u => u.UserId == victim).Name);
        });
    }

    [Fact]
    public async Task UpdateProfile_LegacyArbitraryIdRoute_NoLongerExists()
    {
        await using var factory = new SliceZeroApiFactory();
        using var client = factory.CreateClient();
        var actor = await factory.SeedUserAsync();
        var victim = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, actor);

        var response = await client.PutAsJsonAsync($"/api/users/{victim}/profile", new { name = "Hacked", avatar = (string?)null });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        await factory.WithDbAsync(db => Assert.NotEqual("Hacked", db.Users.Single(u => u.UserId == victim).Name));
    }

    // ── Notifications ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetUserNotifications_OtherUser_IsRejected()
    {
        await using var factory = new SliceZeroApiFactory();
        using var client = factory.CreateClient();
        var victim = await factory.SeedUserAsync();
        var attacker = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, attacker);

        var response = await client.GetAsync($"/api/notifications/user/{victim}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DeleteNotification_BelongingToAnotherUser_IsRejected()
    {
        await using var factory = new SliceZeroApiFactory();
        using var client = factory.CreateClient();
        var victim = await factory.SeedUserAsync();
        var attacker = await factory.SeedUserAsync();
        var notificationId = await factory.SeedNotificationAsync(victim);
        await factory.AuthenticateAsync(client, attacker);

        var response = await client.DeleteAsync($"/api/notifications/{notificationId}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        await factory.WithDbAsync(db => Assert.True(db.Notifications.Any(n => n.NotificationId == notificationId)));
    }

    // ── ActivityLogs: platform-wide audit trail ──────────────────────────────────────

    [Fact]
    public async Task GetAllActivityLogs_NormalUser_IsRejected()
    {
        await using var factory = new SliceZeroApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user);

        var response = await client.GetAsync("/api/activitylogs");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetAllActivityLogs_PlatformAdmin_IsAllowed()
    {
        await using var factory = new SliceZeroApiFactory();
        using var client = factory.CreateClient();
        var admin = await factory.SeedUserAsync("PLATFORM_ADMIN");
        await factory.AuthenticateAsync(client, admin, "PLATFORM_ADMIN");

        var response = await client.GetAsync("/api/activitylogs");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // ── Export: bulk data exfiltration ───────────────────────────────────────────────

    [Fact]
    public async Task ExportProject_NonMember_IsRejected()
    {
        await using var factory = new SliceZeroApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var projectId = await factory.SeedProjectAsync(owner);
        await factory.AuthenticateAsync(client, outsider);

        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync($"/api/projects/{projectId}/export/xlsx")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync($"/api/projects/{projectId}/export/pdf")).StatusCode);
    }

    // ── Invitations ──────────────────────────────────────────────────────────────────

    [Fact]
    public async Task AcceptInvitation_AddressedToSomeoneElse_IsRejectedAndGrantsNoMembership()
    {
        await using var factory = new SliceZeroApiFactory();
        using var client = factory.CreateClient();
        var teamOwner = await factory.SeedUserAsync();
        var attacker = await factory.SeedUserAsync();
        var teamId = await factory.SeedTeamAsync(teamOwner);
        var invitationId = await factory.SeedInvitationAsync(teamId, "invited-person@slicezero.test");
        await factory.AuthenticateAsync(client, attacker);

        var response = await client.PutAsJsonAsync($"/api/invitations/{invitationId}/status", new { status = "Accepted" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        await factory.WithDbAsync(db =>
        {
            Assert.False(db.TeamMembers.Any(m => m.TeamId == teamId && m.UserId == attacker));
            Assert.Equal("Pending", db.Invitations.Single(i => i.InvitationId == invitationId).Status);
        });
    }

    [Fact]
    public async Task CreateInvitation_ForTeamCallerDoesNotManage_IsRejected()
    {
        await using var factory = new SliceZeroApiFactory();
        using var client = factory.CreateClient();
        var teamOwner = await factory.SeedUserAsync();
        var attacker = await factory.SeedUserAsync();
        var teamId = await factory.SeedTeamAsync(teamOwner);
        await factory.AuthenticateAsync(client, attacker);

        var response = await client.PostAsJsonAsync("/api/invitations", new { teamId, email = "someone@slicezero.test" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ListInvitationsByEmail_ForAnotherAddress_IsRejected()
    {
        await using var factory = new SliceZeroApiFactory();
        using var client = factory.CreateClient();
        var attacker = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, attacker);

        var response = await client.GetAsync("/api/invitations/user/someone-else@slicezero.test");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ── Evaluations ──────────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateEvaluation_LeaderIsAlwaysJwtActor()
    {
        await using var factory = new SliceZeroApiFactory();
        using var client = factory.CreateClient();
        var actor = await factory.SeedUserAsync();
        var subject = await factory.SeedUserAsync();
        var impersonatedLeader = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, actor);

        var response = await client.PostAsJsonAsync("/api/evaluations", new
        {
            userId = subject,
            leaderId = impersonatedLeader, // stale field — must be ignored
            skillScore = 5, teamworkScore = 5, deadlineScore = 5, communicationScore = 5
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        await factory.WithDbAsync(db =>
        {
            var evaluation = db.Evaluations.Single(e => e.UserId == subject);
            Assert.Equal(actor, evaluation.LeaderId);
            Assert.NotEqual(impersonatedLeader, evaluation.LeaderId);
        });
    }

    [Fact]
    public async Task GetUserEvaluations_OfAnotherUser_IsRejected()
    {
        await using var factory = new SliceZeroApiFactory();
        using var client = factory.CreateClient();
        var victim = await factory.SeedUserAsync();
        var attacker = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, attacker);

        var response = await client.GetAsync($"/api/evaluations/user/{victim}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ── Meetings ─────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateMeeting_OrganiserIsAlwaysJwtActor()
    {
        await using var factory = new SliceZeroApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var impersonated = await factory.SeedUserAsync();
        var projectId = await factory.SeedProjectAsync(owner);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PostAsJsonAsync("/api/meetings", new
        {
            projectId,
            organizedBy = impersonated, // stale field — must be ignored
            title = "Sprint planning",
            scheduledAt = DateTime.UtcNow.AddDays(1)
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        await factory.WithDbAsync(db =>
        {
            var meeting = db.Meetings.Single(m => m.ProjectId == projectId);
            Assert.Equal(owner, meeting.OrganizedBy);
            Assert.NotEqual(impersonated, meeting.OrganizedBy);
        });
    }

    [Fact]
    public async Task GetMeetingsByProject_NonMember_IsRejected()
    {
        await using var factory = new SliceZeroApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var projectId = await factory.SeedProjectAsync(owner);
        await factory.AuthenticateAsync(client, outsider);

        var response = await client.GetAsync($"/api/meetings/project/{projectId}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task CreateMeeting_OnProjectCallerCannotAccess_IsRejected()
    {
        await using var factory = new SliceZeroApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var projectId = await factory.SeedProjectAsync(owner);
        await factory.AuthenticateAsync(client, outsider);

        var response = await client.PostAsJsonAsync("/api/meetings", new
        {
            projectId, title = "Intrusion", scheduledAt = DateTime.UtcNow.AddDays(1)
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        await factory.WithDbAsync(db => Assert.False(db.Meetings.Any()));
    }

    // ── Anonymous access ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task AuditedEndpoints_Anonymous_ReturnUnauthorized()
    {
        await using var factory = new SliceZeroApiFactory();
        using var client = factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/activitylogs")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/notifications/user/1")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/user-scores/user/1")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/projects/1/export/pdf")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await client.PostAsJsonAsync("/api/user-scores/manual",
                new { userId = 1, type = "REWARD", amount = 1, reason = "x" })).StatusCode);
    }
}

public sealed class SliceZeroApiFactory : WebApplicationFactory<Program>
{
    private const string TestJwtSecret = "taskgenie-slice-zero-authorization-secret32";
    private readonly string _databaseName = $"taskgenie-slice0-{Guid.NewGuid()}";

    public SliceZeroApiFactory()
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
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();
        var user = User.Create($"User {Guid.NewGuid():N}", $"user-{Guid.NewGuid():N}@slicezero.test", "hash", role);
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user.UserId;
    }

    public async Task<int> SeedProjectAsync(int createdBy)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();
        var project = Project.Create($"Project {Guid.NewGuid():N}", null, createdBy);
        context.Projects.Add(project);
        await context.SaveChangesAsync();
        return project.ProjectId;
    }

    public async Task<int> SeedTeamAsync(int createdBy)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();
        var team = Team.Create($"Team {Guid.NewGuid():N}", null, createdBy);
        context.Teams.Add(team);
        await context.SaveChangesAsync();
        context.TeamMembers.Add(TeamMember.Create(team.TeamId, createdBy, "LEADER"));
        await context.SaveChangesAsync();
        return team.TeamId;
    }

    public async Task<int> SeedInvitationAsync(int teamId, string email)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var invitation = Invitation.Create(teamId, email);
        context.Invitations.Add(invitation);
        await context.SaveChangesAsync();
        return invitation.InvitationId;
    }

    public async Task<int> SeedNotificationAsync(int userId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();
        var notification = Notification.Create(userId, "INFO", "Private", "Private message", null, null);
        context.Notifications.Add(notification);
        await context.SaveChangesAsync();
        return notification.NotificationId;
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
