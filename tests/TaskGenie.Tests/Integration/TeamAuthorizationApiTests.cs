using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using TaskGenie.Application.Features.Teams.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Tests.Integration;

public sealed class TeamAuthorizationApiTests
{
    [Fact]
    public async Task Create_Anonymous_ReturnsUnauthorized()
    {
        await using var factory = new TeamAuthorizationApiFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/teams", new { name = "No auth", description = (string?)null });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Create_ActorIsAlwaysFromJwt()
    {
        await using var factory = new TeamAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var actor = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, actor);

        var response = await client.PostAsJsonAsync("/api/teams", new { name = "Real team", description = (string?)null });
        var payload = await response.Content.ReadFromJsonAsync<TeamDto>();

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            var team = context.Teams.Single(t => t.TeamId == payload!.TeamId);
            Assert.Equal(actor, team.CreatedBy);

            var leader = context.TeamMembers.Single(m => m.TeamId == team.TeamId);
            Assert.Equal(actor, leader.UserId);
            Assert.Equal("LEADER", leader.Role);
        });
    }

    [Fact]
    public async Task Create_CreatesTeamAndCreatorLeaderMembershipAtomically()
    {
        await using var factory = new TeamAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var actor = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, actor);

        var response = await client.PostAsJsonAsync("/api/teams", new { name = "Atomic team", description = (string?)null });
        var payload = await response.Content.ReadFromJsonAsync<TeamDto>();

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            Assert.True(context.Teams.Any(t => t.TeamId == payload!.TeamId));
            var membership = context.TeamMembers.Single(m => m.TeamId == payload!.TeamId);
            Assert.Equal(actor, membership.UserId);
            Assert.Equal("LEADER", membership.Role);
        });
    }

    [Fact]
    public async Task GetAll_NormalUser_OnlySeesOwnOrMemberTeams()
    {
        await using var factory = new TeamAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var self = await factory.SeedUserAsync();
        var otherOwner = await factory.SeedUserAsync();

        var ownTeamId = await factory.SeedTeamAsync(self);
        var memberTeamId = await factory.SeedTeamAsync(otherOwner, extraMemberUserIds: [self]);
        var unrelatedTeamId = await factory.SeedTeamAsync(otherOwner);

        await factory.AuthenticateAsync(client, self);
        var teams = await client.GetFromJsonAsync<List<TeamDto>>("/api/teams");

        var ids = teams!.Select(t => t.TeamId).ToList();
        Assert.Contains(ownTeamId, ids);
        Assert.Contains(memberTeamId, ids);
        Assert.DoesNotContain(unrelatedTeamId, ids);
    }

    [Fact]
    public async Task GetAll_PlatformAdmin_SeesEveryTeam()
    {
        await using var factory = new TeamAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var admin = await factory.SeedUserAsync();
        var teamId = await factory.SeedTeamAsync(owner);

        await factory.AuthenticateAsync(client, admin, role: "PLATFORM_ADMIN");
        var teams = await client.GetFromJsonAsync<List<TeamDto>>("/api/teams");

        Assert.Contains(teams!, t => t.TeamId == teamId);
    }

    [Fact]
    public async Task GetById_Outsider_ReturnsForbidden()
    {
        await using var factory = new TeamAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var teamId = await factory.SeedTeamAsync(owner);
        await factory.AuthenticateAsync(client, outsider);

        var response = await client.GetAsync($"/api/teams/{teamId}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetById_Member_ReturnsOk()
    {
        await using var factory = new TeamAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var teamId = await factory.SeedTeamAsync(owner, extraMemberUserIds: [member]);
        await factory.AuthenticateAsync(client, member);

        var response = await client.GetAsync($"/api/teams/{teamId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetById_NonExistentTeam_ReturnsNotFound()
    {
        await using var factory = new TeamAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user);

        var response = await client.GetAsync("/api/teams/999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task AddMember_Outsider_ReturnsForbidden()
    {
        await using var factory = new TeamAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var invitee = await factory.SeedUserAsync();
        var teamId = await factory.SeedTeamAsync(owner);
        await factory.AuthenticateAsync(client, outsider);

        var response = await client.PostAsJsonAsync($"/api/teams/{teamId}/members", new { userId = invitee, role = "MEMBER" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AddMember_MemberButNotCreator_ReturnsForbidden()
    {
        // Plain membership (even LEADER) is not "manage" — only PLATFORM_ADMIN or the team creator.
        await using var factory = new TeamAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var leaderMember = await factory.SeedUserAsync();
        var invitee = await factory.SeedUserAsync();
        var teamId = await factory.SeedTeamAsync(owner, extraMemberUserIds: [leaderMember], extraMemberRole: "LEADER");
        await factory.AuthenticateAsync(client, leaderMember);

        var response = await client.PostAsJsonAsync($"/api/teams/{teamId}/members", new { userId = invitee, role = "MEMBER" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AddMember_Creator_Succeeds()
    {
        await using var factory = new TeamAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var invitee = await factory.SeedUserAsync();
        var teamId = await factory.SeedTeamAsync(owner);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PostAsJsonAsync($"/api/teams/{teamId}/members", new { userId = invitee, role = "MEMBER" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            Assert.True(context.TeamMembers.Any(m => m.TeamId == teamId && m.UserId == invitee));
        });
    }

    [Fact]
    public async Task AddMember_InvalidRole_ReturnsBadRequest()
    {
        await using var factory = new TeamAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var invitee = await factory.SeedUserAsync();
        var teamId = await factory.SeedTeamAsync(owner);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PostAsJsonAsync($"/api/teams/{teamId}/members", new { userId = invitee, role = "SUPERUSER" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddMember_DuplicateMember_ReturnsBadRequest()
    {
        await using var factory = new TeamAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var existingMember = await factory.SeedUserAsync();
        var teamId = await factory.SeedTeamAsync(owner, extraMemberUserIds: [existingMember]);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PostAsJsonAsync($"/api/teams/{teamId}/members", new { userId = existingMember, role = "MEMBER" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddMember_UnknownUserId_ReturnsNotFound()
    {
        await using var factory = new TeamAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var teamId = await factory.SeedTeamAsync(owner);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PostAsJsonAsync($"/api/teams/{teamId}/members", new { userId = 999999, role = "MEMBER" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task RemoveMember_LastLeader_ReturnsBadRequest()
    {
        await using var factory = new TeamAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var teamId = await factory.SeedTeamAsync(owner); // owner is the only LEADER
        var leaderMemberId = await factory.GetLeaderMembershipIdAsync(teamId, owner);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.DeleteAsync($"/api/teams/members/{leaderMemberId}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            Assert.True(context.TeamMembers.Any(m => m.Id == leaderMemberId));
        });
    }

    [Fact]
    public async Task RemoveMember_NonLastMember_Succeeds()
    {
        await using var factory = new TeamAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var teamId = await factory.SeedTeamAsync(owner, extraMemberUserIds: [member]);
        var memberMembershipId = await factory.GetMembershipIdAsync(teamId, member);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.DeleteAsync($"/api/teams/members/{memberMembershipId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Delete_ReferencedByProject_ReturnsBadRequestAndDoesNotDelete()
    {
        await using var factory = new TeamAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var teamId = await factory.SeedTeamAsync(owner);
        await factory.SeedProjectOnTeamAsync(owner, teamId);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.DeleteAsync($"/api/teams/{teamId}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            Assert.True(context.Teams.Any(t => t.TeamId == teamId));
        });
    }

    [Fact]
    public async Task Delete_StandaloneTeam_CleansUpMembersAtomically()
    {
        await using var factory = new TeamAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var teamId = await factory.SeedTeamAsync(owner, extraMemberUserIds: [member]);
        await factory.SeedInvitationAsync(teamId, "invitee@teams.test");
        await factory.AuthenticateAsync(client, owner);

        var response = await client.DeleteAsync($"/api/teams/{teamId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            Assert.False(context.Teams.Any(t => t.TeamId == teamId));
            Assert.False(context.TeamMembers.Any(m => m.TeamId == teamId));
            Assert.False(context.Invitations.Any(i => i.TeamId == teamId));
        });
    }

    [Fact]
    public async Task Delete_Outsider_ReturnsForbidden()
    {
        await using var factory = new TeamAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var teamId = await factory.SeedTeamAsync(owner);
        await factory.AuthenticateAsync(client, outsider);

        var response = await client.DeleteAsync($"/api/teams/{teamId}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}

public sealed class TeamAuthorizationApiFactory : WebApplicationFactory<Program>
{
    private const string TestJwtSecret = "taskgenie-team-authz-test-secret-32chars";
    private readonly string _databaseName = $"taskgenie-team-authz-{Guid.NewGuid()}";

    public TeamAuthorizationApiFactory()
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
        var user = User.Create($"User {Guid.NewGuid():N}", $"user-{Guid.NewGuid():N}@teams.test", "hash");
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user.UserId;
    }

    public async Task<int> SeedTeamAsync(int owner, int[]? extraMemberUserIds = null, string extraMemberRole = "MEMBER")
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var team = Team.Create($"Team {Guid.NewGuid():N}", null, owner);
        context.Teams.Add(team);
        await context.SaveChangesAsync();

        context.TeamMembers.Add(TeamMember.Create(team.TeamId, owner, "LEADER"));
        foreach (var memberId in extraMemberUserIds ?? [])
            context.TeamMembers.Add(TeamMember.Create(team.TeamId, memberId, extraMemberRole));
        await context.SaveChangesAsync();

        return team.TeamId;
    }

    public async Task SeedProjectOnTeamAsync(int createdBy, int teamId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var project = Project.Create($"Project {Guid.NewGuid():N}", null, createdBy);
        project.SetTeamId(teamId);
        context.Projects.Add(project);
        await context.SaveChangesAsync();
    }

    public async Task SeedInvitationAsync(int teamId, string email)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        context.Invitations.Add(Invitation.Create(teamId, email));
        await context.SaveChangesAsync();
    }

    public async Task<int> GetLeaderMembershipIdAsync(int teamId, int userId)
        => await GetMembershipIdAsync(teamId, userId);

    public async Task<int> GetMembershipIdAsync(int teamId, int userId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var member = await context.TeamMembers.SingleAsync(m => m.TeamId == teamId && m.UserId == userId);
        return member.Id;
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
