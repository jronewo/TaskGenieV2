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
/// Inviting somebody has to reach them: an in-app notification when they already have an account,
/// and an email that points back at the notification centre. Neither channel may take the accept
/// decision on its own, and neither may break the invitation when it fails.
/// </summary>
public sealed class InvitationNotificationApiTests
{
    [Fact]
    public async Task Invite_ExistingUser_WritesAnInAppNotification()
    {
        await using var factory = new InvitationNotificationApiFactory();
        using var client = factory.CreateClient();
        var leader = await factory.SeedUserAsync();
        var invitee = await factory.SeedUserAsync("invitee@notify.test");
        var teamId = await factory.SeedTeamWithLeaderAsync(leader);
        await factory.AuthenticateAsync(client, leader, "NORMAL_USER");

        var response = await client.PostAsJsonAsync("/api/invitations", new { teamId, email = "invitee@notify.test" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            var notification = context.Notifications.SingleOrDefault(n => n.UserId == invitee);
            Assert.NotNull(notification);
            Assert.Equal("INVITATION", notification!.Type);
            Assert.Equal("INVITATION", notification.ReferenceType);
        });
    }

    [Fact]
    public async Task Invite_SendsAnEmailPointingAtTheNotificationCentre()
    {
        await using var factory = new InvitationNotificationApiFactory();
        using var client = factory.CreateClient();
        var leader = await factory.SeedUserAsync();
        var teamId = await factory.SeedTeamWithLeaderAsync(leader);
        await factory.AuthenticateAsync(client, leader, "NORMAL_USER");

        await client.PostAsJsonAsync("/api/invitations", new { teamId, email = "stranger@notify.test" });

        Assert.Equal("stranger@notify.test", factory.EmailSender.LastInvitationEmail);
        Assert.NotNull(factory.EmailSender.LastInvitationRespondUrl);
        // The link must land in the app, not carry a decision of its own.
        Assert.Contains("notifications", factory.EmailSender.LastInvitationRespondUrl!, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("accept", factory.EmailSender.LastInvitationRespondUrl!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Invite_UnknownEmail_StillSucceedsWithoutANotification()
    {
        await using var factory = new InvitationNotificationApiFactory();
        using var client = factory.CreateClient();
        var leader = await factory.SeedUserAsync();
        var teamId = await factory.SeedTeamWithLeaderAsync(leader);
        await factory.AuthenticateAsync(client, leader, "NORMAL_USER");

        var response = await client.PostAsJsonAsync("/api/invitations", new { teamId, email = "nobody@notify.test" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        // Nobody to notify in-app; the invitation row and the email still happen.
        await factory.WithDbAsync(context => Assert.Empty(context.Notifications.Where(n => n.Type == "INVITATION")));
        Assert.Equal("nobody@notify.test", factory.EmailSender.LastInvitationEmail);
    }

    [Fact]
    public async Task Invite_ByOutsider_IsForbiddenAndNotifiesNobody()
    {
        await using var factory = new InvitationNotificationApiFactory();
        using var client = factory.CreateClient();
        var leader = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync("outsider@notify.test");
        var teamId = await factory.SeedTeamWithLeaderAsync(leader);
        await factory.AuthenticateAsync(client, outsider, "NORMAL_USER");

        var response = await client.PostAsJsonAsync("/api/invitations", new { teamId, email = "victim@notify.test" });

        Assert.True(
            response.StatusCode is HttpStatusCode.Forbidden or HttpStatusCode.NotFound,
            $"Expected 403/404 but got {(int)response.StatusCode}.");
        Assert.Null(factory.EmailSender.LastInvitationEmail);
        await factory.WithDbAsync(context => Assert.Empty(context.Invitations));
    }

    [Fact]
    public async Task Respond_LowercaseAccepted_JoinsTheTeam()
    {
        await using var factory = new InvitationNotificationApiFactory();
        using var leaderClient = factory.CreateClient();
        using var inviteeClient = factory.CreateClient();
        var leader = await factory.SeedUserAsync();
        var invitee = await factory.SeedUserAsync("joiner@notify.test");
        var teamId = await factory.SeedTeamWithLeaderAsync(leader);
        await factory.AuthenticateAsync(leaderClient, leader, "NORMAL_USER");
        await factory.AuthenticateAsync(inviteeClient, invitee, "NORMAL_USER");

        var created = await leaderClient.PostAsJsonAsync("/api/invitations", new { teamId, email = "joiner@notify.test" });
        var invitationId = (await created.Content.ReadFromJsonAsync<InvitationResponse>())!.InvitationId;

        // Lowercase used to flip the status without ever adding the member — the two had to agree.
        var response = await inviteeClient.PutAsJsonAsync($"/api/invitations/{invitationId}/status", new { status = "accepted" });

        Assert.True(response.IsSuccessStatusCode, $"Expected success but got {(int)response.StatusCode}.");
        await factory.WithDbAsync(context =>
        {
            Assert.Contains(context.TeamMembers, m => m.TeamId == teamId && m.UserId == invitee);
            Assert.Equal("Accepted", context.Invitations.Single(i => i.InvitationId == invitationId).Status);
        });
    }

    [Fact]
    public async Task Respond_UnknownStatus_IsRejectedAndNothingChanges()
    {
        await using var factory = new InvitationNotificationApiFactory();
        using var leaderClient = factory.CreateClient();
        using var inviteeClient = factory.CreateClient();
        var leader = await factory.SeedUserAsync();
        var invitee = await factory.SeedUserAsync("picky@notify.test");
        var teamId = await factory.SeedTeamWithLeaderAsync(leader);
        await factory.AuthenticateAsync(leaderClient, leader, "NORMAL_USER");
        await factory.AuthenticateAsync(inviteeClient, invitee, "NORMAL_USER");

        var created = await leaderClient.PostAsJsonAsync("/api/invitations", new { teamId, email = "picky@notify.test" });
        var invitationId = (await created.Content.ReadFromJsonAsync<InvitationResponse>())!.InvitationId;

        var response = await inviteeClient.PutAsJsonAsync($"/api/invitations/{invitationId}/status", new { status = "garbage" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            Assert.Equal("Pending", context.Invitations.Single(i => i.InvitationId == invitationId).Status);
            Assert.DoesNotContain(context.TeamMembers, m => m.TeamId == teamId && m.UserId == invitee);
        });
    }

    [Fact]
    public async Task Invite_WhenEmailFails_StillCreatesTheInvitation()
    {
        await using var factory = new InvitationNotificationApiFactory();
        factory.EmailSender.ThrowOnInvitation = true;
        using var client = factory.CreateClient();
        var leader = await factory.SeedUserAsync();
        var teamId = await factory.SeedTeamWithLeaderAsync(leader);
        await factory.AuthenticateAsync(client, leader, "NORMAL_USER");

        var response = await client.PostAsJsonAsync("/api/invitations", new { teamId, email = "flaky@notify.test" });

        // The invitation is the durable record; a dead mail provider must not lose it.
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        await factory.WithDbAsync(context => Assert.Single(context.Invitations));
    }

    private sealed record InvitationResponse(int InvitationId);
}

public sealed class RecordingInvitationEmailSender : IEmailSender
{
    public string? LastInvitationEmail { get; private set; }
    public string? LastInvitationRespondUrl { get; private set; }
    public bool ThrowOnInvitation { get; set; }

    public Task SendPasswordResetEmailAsync(string toEmail, string resetToken, CancellationToken ct = default)
        => Task.CompletedTask;

    public Task SendTeamInvitationEmailAsync(
        string toEmail,
        string teamName,
        string invitedByName,
        string respondUrl,
        CancellationToken ct = default)
    {
        if (ThrowOnInvitation) throw new InvalidOperationException("mail provider down");
        LastInvitationEmail = toEmail;
        LastInvitationRespondUrl = respondUrl;
        return Task.CompletedTask;
    }
}

public sealed class InvitationNotificationApiFactory : WebApplicationFactory<Program>
{
    private const string TestJwtSecret = "taskgenie-invitation-notify-test-secret32";
    private readonly string _databaseName = $"taskgenie-invite-{Guid.NewGuid()}";

    public RecordingInvitationEmailSender EmailSender { get; } = new();

    public InvitationNotificationApiFactory()
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

            services.RemoveAll<IEmailSender>();
            services.AddSingleton<IEmailSender>(EmailSender);
        });
    }

    public async Task<int> SeedUserAsync(string? email = null)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();
        var user = User.Create($"User {Guid.NewGuid():N}", email ?? $"user-{Guid.NewGuid():N}@notify.test", "hash");
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user.UserId;
    }

    public async Task<int> SeedTeamWithLeaderAsync(int leaderId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();
        var team = Team.Create("Notify Team", "seeded", leaderId);
        context.Teams.Add(team);
        await context.SaveChangesAsync();
        context.TeamMembers.Add(TeamMember.Create(team.TeamId, leaderId, "LEADER"));
        await context.SaveChangesAsync();
        return team.TeamId;
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
