using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using TaskGenie.Application.Features.Auth.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Tests.Integration;

/// <summary>Covers PROD-0101: persistent rotating refresh tokens, /auth/me, forgot/reset password
/// and their negative paths (reuse detection, expiry, invalid/used tokens).</summary>
public sealed class AuthIdentityLifecycleApiTests
{
    [Fact]
    public async Task Register_IssuesAccessAndRefreshToken()
    {
        await using var factory = new AuthApiFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            name = "Alice",
            email = $"{Guid.NewGuid():N}@auth.test",
            password = "P@ssword1"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        Assert.False(string.IsNullOrWhiteSpace(auth!.AccessToken));
        Assert.False(string.IsNullOrWhiteSpace(auth.RefreshToken));
        Assert.True(auth.RefreshTokenExpiresAtUtc > DateTime.UtcNow);
    }

    [Fact]
    public async Task Refresh_WithValidToken_RotatesAndReturnsNewTokens()
    {
        await using var factory = new AuthApiFactory();
        using var client = factory.CreateClient();
        var auth = await factory.RegisterAsync(client);

        var response = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = auth.RefreshToken });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var rotated = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(rotated);
        Assert.NotEqual(auth.RefreshToken, rotated!.RefreshToken);
        Assert.NotEqual(auth.AccessToken, rotated.AccessToken);
        Assert.Equal(auth.UserId, rotated.UserId);
    }

    [Fact]
    public async Task Refresh_ReusingAlreadyRotatedToken_RevokesWholeFamily()
    {
        await using var factory = new AuthApiFactory();
        using var client = factory.CreateClient();
        var auth = await factory.RegisterAsync(client);

        var firstRefresh = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = auth.RefreshToken });
        var rotated = await firstRefresh.Content.ReadFromJsonAsync<AuthResponse>();

        // Replaying the original (now-revoked) token must fail...
        var reuseAttempt = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = auth.RefreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, reuseAttempt.StatusCode);

        // ...and must also burn the token that replaced it, since reuse is a compromise signal.
        var followUp = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = rotated!.RefreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, followUp.StatusCode);
    }

    [Fact]
    public async Task Refresh_WithGarbageToken_ReturnsUnauthorized()
    {
        await using var factory = new AuthApiFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = "not-a-real-token" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Refresh_WithExpiredToken_ReturnsUnauthorized()
    {
        await using var factory = new AuthApiFactory();
        using var client = factory.CreateClient();
        var auth = await factory.RegisterAsync(client);

        await factory.WithDbAsync(async db =>
        {
            var token = await db.RefreshTokens.SingleAsync(t => t.UserId == auth.UserId);
            db.Entry(token).Property("ExpiresAtUtc").CurrentValue = DateTime.UtcNow.AddMinutes(-1);
            await db.SaveChangesAsync();
        });

        var response = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = auth.RefreshToken });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_Authenticated_ReturnsIdentity()
    {
        await using var factory = new AuthApiFactory();
        using var client = factory.CreateClient();
        var auth = await factory.RegisterAsync(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);

        var response = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Assert.Equal(auth.UserId, body.GetProperty("userId").GetInt32());
        Assert.Equal(auth.Email, body.GetProperty("email").GetString());
    }

    [Fact]
    public async Task Me_Anonymous_ReturnsUnauthorized()
    {
        await using var factory = new AuthApiFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Logout_RevokesSuppliedRefreshToken()
    {
        await using var factory = new AuthApiFactory();
        using var client = factory.CreateClient();
        var auth = await factory.RegisterAsync(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);

        var logout = await client.PostAsJsonAsync("/api/auth/logout", new { refreshToken = auth.RefreshToken });
        Assert.Equal(HttpStatusCode.OK, logout.StatusCode);

        client.DefaultRequestHeaders.Authorization = null;
        var refreshAfterLogout = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = auth.RefreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, refreshAfterLogout.StatusCode);
    }

    [Fact]
    public async Task ForgotPassword_UnknownEmail_StillReturnsGenericSuccess()
    {
        await using var factory = new AuthApiFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/forgot-password", new { email = $"{Guid.NewGuid():N}@nobody.test" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Null(factory.EmailSender.LastToken);
    }

    [Fact]
    public async Task ForgotPassword_KnownEmail_CreatesUsableResetToken()
    {
        await using var factory = new AuthApiFactory();
        using var client = factory.CreateClient();
        var auth = await factory.RegisterAsync(client);

        var response = await client.PostAsJsonAsync("/api/auth/forgot-password", new { email = auth.Email });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(factory.EmailSender.LastToken);
        await factory.WithDbAsync(async db =>
        {
            var count = await db.PasswordResetTokens.CountAsync(t => t.UserId == auth.UserId);
            Assert.Equal(1, count);
        });
    }

    [Fact]
    public async Task ResetPassword_ValidToken_ChangesPasswordAndRevokesAllSessions()
    {
        await using var factory = new AuthApiFactory();
        using var client = factory.CreateClient();
        var auth = await factory.RegisterAsync(client);

        await client.PostAsJsonAsync("/api/auth/forgot-password", new { email = auth.Email });
        var rawToken = factory.EmailSender.LastToken!;

        var resetResponse = await client.PostAsJsonAsync("/api/auth/reset-password", new { token = rawToken, newPassword = "N3wP@ssword" });
        Assert.Equal(HttpStatusCode.OK, resetResponse.StatusCode);

        // Old refresh token from registration must be dead now.
        var refreshAfterReset = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = auth.RefreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, refreshAfterReset.StatusCode);

        // Old password no longer works; new password does.
        var loginOld = await client.PostAsJsonAsync("/api/auth/login", new { email = auth.Email, password = "P@ssword1" });
        Assert.Equal(HttpStatusCode.Unauthorized, loginOld.StatusCode);

        var loginNew = await client.PostAsJsonAsync("/api/auth/login", new { email = auth.Email, password = "N3wP@ssword" });
        Assert.Equal(HttpStatusCode.OK, loginNew.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_TokenCannotBeReplayed()
    {
        await using var factory = new AuthApiFactory();
        using var client = factory.CreateClient();
        var auth = await factory.RegisterAsync(client);

        await client.PostAsJsonAsync("/api/auth/forgot-password", new { email = auth.Email });
        var rawToken = factory.EmailSender.LastToken!;

        var first = await client.PostAsJsonAsync("/api/auth/reset-password", new { token = rawToken, newPassword = "N3wP@ssword" });
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        var replay = await client.PostAsJsonAsync("/api/auth/reset-password", new { token = rawToken, newPassword = "AnotherP@ss1" });
        Assert.Equal(HttpStatusCode.Unauthorized, replay.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_InvalidToken_ReturnsUnauthorized()
    {
        await using var factory = new AuthApiFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/reset-password", new { token = "not-a-real-token", newPassword = "N3wP@ssword" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AuthEndpoints_ExceedingRateLimit_ReturnTooManyRequests()
    {
        await using var factory = new AuthRateLimitedApiFactory();
        using var client = factory.CreateClient();

        HttpResponseMessage? last = null;
        for (var i = 0; i < 11; i++)
        {
            last = await client.PostAsJsonAsync("/api/auth/login", new { email = "nobody@rate.test", password = "wrong-password" });
        }

        Assert.Equal(HttpStatusCode.TooManyRequests, last!.StatusCode);
    }
}

/// <summary>Captures the token handed to the email sender so tests can drive the forgot/reset
/// flow without the API ever exposing the raw secret over HTTP (which it must not).</summary>
public sealed class CapturingEmailSender : IEmailSender
{
    public string? LastEmail { get; private set; }
    public string? LastToken { get; private set; }

    public string? LastInvitationEmail { get; private set; }
    public string? LastInvitationTeam { get; private set; }
    public string? LastInvitationRespondUrl { get; private set; }

    public Task SendPasswordResetEmailAsync(string toEmail, string resetToken, CancellationToken ct = default)
    {
        LastEmail = toEmail;
        LastToken = resetToken;
        return Task.CompletedTask;
    }

    public Task SendTeamInvitationEmailAsync(
        string toEmail,
        string teamName,
        string invitedByName,
        string respondUrl,
        CancellationToken ct = default)
    {
        LastInvitationEmail = toEmail;
        LastInvitationTeam = teamName;
        LastInvitationRespondUrl = respondUrl;
        return Task.CompletedTask;
    }
}

public sealed class AuthApiFactory : WebApplicationFactory<Program>
{
    private const string TestJwtSecret = "taskgenie-auth-lifecycle-test-secret-32chars";
    private readonly string _databaseName = $"taskgenie-auth-{Guid.NewGuid()}";

    public CapturingEmailSender EmailSender { get; } = new();

    public AuthApiFactory()
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

    public async Task<AuthResponse> RegisterAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            name = "Auth Lifecycle Test",
            email = $"{Guid.NewGuid():N}@auth.test",
            password = "P@ssword1"
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = null;
        return auth!;
    }

    public async Task WithDbAsync(Func<AppDbContext, Task> action)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await action(context);
    }
}

/// <summary>Separate host, deliberately NOT in the "Testing" environment, so the real fixed-window
/// auth rate limiter is enforced (it is bypassed under "Testing" so the rest of the suite can call
/// auth endpoints freely).</summary>
public sealed class AuthRateLimitedApiFactory : WebApplicationFactory<Program>
{
    private const string TestJwtSecret = "taskgenie-auth-ratelimit-test-secret-32ch";
    private readonly string _databaseName = $"taskgenie-auth-ratelimit-{Guid.NewGuid()}";

    public AuthRateLimitedApiFactory()
    {
        Environment.SetEnvironmentVariable("Jwt__Secret", TestJwtSecret);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("RateLimitTesting");
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.RemoveAll<AppDbContext>();
            services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(_databaseName));
        });
    }
}
