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

/// <summary>Covers the PROD-0202 gaps found in SkillsController: master-skill creation was open to
/// any authenticated user, AddUserSkill took the target UserId from the client body, and
/// update/remove of a UserSkill row had no ownership check at all (IDOR).</summary>
public sealed class SkillAuthorizationApiTests
{
    [Fact]
    public async Task CreateSkill_NormalUser_ReturnsForbidden()
    {
        await using var factory = new SkillAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user, "NORMAL_USER");

        var response = await client.PostAsJsonAsync("/api/skills", new { skillName = "Rogue skill" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        await factory.WithDbAsync(context => Assert.False(context.Skills.Any(s => s.SkillName == "Rogue skill")));
    }

    [Fact]
    public async Task CreateSkill_PlatformAdmin_Succeeds()
    {
        await using var factory = new SkillAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var admin = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, admin, "PLATFORM_ADMIN");

        var response = await client.PostAsJsonAsync("/api/skills", new { skillName = "Approved skill" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task AddUserSkill_AlwaysAttachesToJwtActorNotBodyUserId()
    {
        await using var factory = new SkillAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var actor = await factory.SeedUserAsync();
        var victim = await factory.SeedUserAsync();
        var skillId = await factory.SeedSkillAsync();
        await factory.AuthenticateAsync(client, actor, "NORMAL_USER");

        var response = await client.PostAsJsonAsync("/api/skills/user", new
        {
            userId = victim, // stale field — must not be honoured
            skillId,
            level = 5
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            Assert.True(context.UserSkills.Any(us => us.UserId == actor && us.SkillId == skillId));
            Assert.False(context.UserSkills.Any(us => us.UserId == victim));
        });
    }

    [Fact]
    public async Task UpdateUserSkillLevel_OtherUsersRow_ReturnsForbidden()
    {
        await using var factory = new SkillAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var attacker = await factory.SeedUserAsync();
        var skillId = await factory.SeedSkillAsync();
        var userSkillId = await factory.SeedUserSkillAsync(owner, skillId, level: 3);
        await factory.AuthenticateAsync(client, attacker, "NORMAL_USER");

        var response = await client.PutAsJsonAsync($"/api/skills/user/{userSkillId}", 9);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            var row = context.UserSkills.Single(us => us.Id == userSkillId);
            Assert.Equal(3, row.Level);
        });
    }

    [Fact]
    public async Task UpdateUserSkillLevel_OwnRow_Succeeds()
    {
        await using var factory = new SkillAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var skillId = await factory.SeedSkillAsync();
        var userSkillId = await factory.SeedUserSkillAsync(owner, skillId, level: 3);
        await factory.AuthenticateAsync(client, owner, "NORMAL_USER");

        var response = await client.PutAsJsonAsync($"/api/skills/user/{userSkillId}", 9);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            var row = context.UserSkills.Single(us => us.Id == userSkillId);
            Assert.Equal(9, row.Level);
        });
    }

    [Fact]
    public async Task RemoveUserSkill_OtherUsersRow_ReturnsForbidden()
    {
        await using var factory = new SkillAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var attacker = await factory.SeedUserAsync();
        var skillId = await factory.SeedSkillAsync();
        var userSkillId = await factory.SeedUserSkillAsync(owner, skillId, level: 3);
        await factory.AuthenticateAsync(client, attacker, "NORMAL_USER");

        var response = await client.DeleteAsync($"/api/skills/user/{userSkillId}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        await factory.WithDbAsync(context => Assert.True(context.UserSkills.Any(us => us.Id == userSkillId)));
    }

    [Fact]
    public async Task RemoveUserSkill_OwnRow_Succeeds()
    {
        await using var factory = new SkillAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var skillId = await factory.SeedSkillAsync();
        var userSkillId = await factory.SeedUserSkillAsync(owner, skillId, level: 3);
        await factory.AuthenticateAsync(client, owner, "NORMAL_USER");

        var response = await client.DeleteAsync($"/api/skills/user/{userSkillId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await factory.WithDbAsync(context => Assert.False(context.UserSkills.Any(us => us.Id == userSkillId)));
    }

    [Fact]
    public async Task RemoveUserSkill_PlatformAdminCanManageAnyRow()
    {
        await using var factory = new SkillAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var admin = await factory.SeedUserAsync();
        var skillId = await factory.SeedSkillAsync();
        var userSkillId = await factory.SeedUserSkillAsync(owner, skillId, level: 3);
        await factory.AuthenticateAsync(client, admin, "PLATFORM_ADMIN");

        var response = await client.DeleteAsync($"/api/skills/user/{userSkillId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task UpdateUserSkillLevel_UnknownRow_ReturnsNotFound()
    {
        await using var factory = new SkillAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user, "NORMAL_USER");

        var response = await client.PutAsJsonAsync("/api/skills/user/999999", 4);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task SkillEndpoints_Anonymous_ReturnUnauthorized()
    {
        await using var factory = new SkillAuthorizationApiFactory();
        using var client = factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/skills")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await client.PostAsJsonAsync("/api/skills/user", new { skillId = 1, level = 1 })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.DeleteAsync("/api/skills/user/1")).StatusCode);
    }
}

public sealed class SkillAuthorizationApiFactory : WebApplicationFactory<Program>
{
    private const string TestJwtSecret = "taskgenie-skill-authorization-test-secret32";
    private readonly string _databaseName = $"taskgenie-skill-auth-{Guid.NewGuid()}";

    public SkillAuthorizationApiFactory()
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
        var user = User.Create($"User {Guid.NewGuid():N}", $"user-{Guid.NewGuid():N}@skills.test", "hash");
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user.UserId;
    }

    public async Task<int> SeedSkillAsync()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();
        var skill = Skill.Create($"Skill {Guid.NewGuid():N}");
        context.Skills.Add(skill);
        await context.SaveChangesAsync();
        return skill.SkillId;
    }

    public async Task<int> SeedUserSkillAsync(int userId, int skillId, int level)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var userSkill = UserSkill.Create(userId, skillId, level);
        context.UserSkills.Add(userSkill);
        await context.SaveChangesAsync();
        return userSkill.Id;
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
