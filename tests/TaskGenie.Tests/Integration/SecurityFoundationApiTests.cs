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

public sealed class SecurityFoundationApiTests
{
    [Fact]
    public async Task AdminPlatformStats_Anonymous_ReturnsUnauthorized()
    {
        await using var factory = new SecurityApiFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/admin/platform-stats");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AdminPlatformStats_NormalUser_ReturnsForbidden()
    {
        await using var factory = new SecurityApiFactory();
        using var client = factory.CreateClient();
        var userId = await factory.SeedUserAsync("NORMAL_USER");
        await factory.AuthenticateAsync(client, userId, "NORMAL_USER");

        var response = await client.GetAsync("/api/admin/platform-stats");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AdminPlatformStats_PlatformAdmin_ReturnsOk()
    {
        await using var factory = new SecurityApiFactory();
        using var client = factory.CreateClient();
        var userId = await factory.SeedUserAsync("PLATFORM_ADMIN");
        await factory.AuthenticateAsync(client, userId, "PLATFORM_ADMIN");

        var response = await client.GetAsync("/api/admin/platform-stats");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task CreateProject_ForgedCreatedByInBody_IsIgnoredAndActorTakenFromJwt()
    {
        await using var factory = new SecurityApiFactory();
        using var client = factory.CreateClient();
        var actualActorId = await factory.SeedUserAsync("NORMAL_USER");
        var impersonatedId = await factory.SeedUserAsync("NORMAL_USER");
        await factory.AuthenticateAsync(client, actualActorId, "NORMAL_USER");

        var response = await client.PostAsJsonAsync("/api/projects", new
        {
            name = "Forged actor project",
            description = "attempt to forge CreatedBy",
            createdBy = impersonatedId,
            organizationId = (int?)null,
            deadline = (DateOnly?)null
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<ProjectDto>();
        Assert.NotNull(payload);
        Assert.Equal(actualActorId, payload!.CreatedBy);
        Assert.NotEqual(impersonatedId, payload.CreatedBy);

        await factory.WithDbAsync(context =>
        {
            var project = context.Projects.Single(p => p.ProjectId == payload.ProjectId);
            Assert.Equal(actualActorId, project.CreatedBy);
        });
    }
}

public sealed class SecurityApiFactory : WebApplicationFactory<Program>
{
    private const string TestJwtSecret = "taskgenie-security-foundation-test-secret-32c";
    private readonly string _databaseName = $"taskgenie-security-{Guid.NewGuid()}";

    public SecurityApiFactory()
    {
        // Minimal-host startup reads environment variables before ConfigureWebHost runs.
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

    public async Task<int> SeedUserAsync(string role)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();
        var user = User.Create($"Security Test {Guid.NewGuid():N}", $"{Guid.NewGuid():N}@security.test", "hash", role);
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user.UserId;
    }

    public async Task AuthenticateAsync(HttpClient client, int userId, string role)
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
