using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;
// `TaskGenie.Domain.Entities.Task` collides with System.Threading.Tasks.Task, so the entity is
// imported by alias rather than pulling the whole namespace in.
using UserEntity = TaskGenie.Domain.Entities.User;

namespace TaskGenie.API.Extensions;

/// <summary>
/// Promotes one already-registered account to PLATFORM_ADMIN when the platform has none.
///
/// This solves the genuine chicken-and-egg problem of the first administrator: admin management is
/// itself admin-only, so without this the very first admin could never be created through the API.
/// It is a controlled configuration action, not seeded data:
///
///  - the target is named explicitly by configuration (`Bootstrap:PlatformAdminEmail`, supplied via
///    user-secrets or an environment variable — never committed);
///  - the account must already exist, created by a real sign-up. No user is invented;
///  - it is a no-op the moment any active PLATFORM_ADMIN exists, so it cannot be used to
///    silently re-escalate later;
///  - the promotion is logged as a security event.
/// </summary>
public static class PlatformAdminBootstrap
{
    public const string ConfigKey = "Bootstrap:PlatformAdminEmail";

    /// <summary>
    /// A ready-made administrator for local development and demos, so a fresh database is usable
    /// without a manual sign-up first.
    ///
    /// Refused outright in Production — the credentials are in source control, so an environment
    /// that created this account would be publishing an administrator login to anyone who can read
    /// the repository. Production uses <see cref="ConfigKey"/> to promote a real, self-registered
    /// account instead.
    /// </summary>
    private const string DevAdminEmail = "admin@gmail.com";
    private const string DevAdminPassword = "123456";

    public static async Task BootstrapPlatformAdminAsync(this WebApplication app)
    {
        await SeedDevelopmentAdminAsync(app);

        var email = app.Configuration[ConfigKey];
        if (string.IsNullOrWhiteSpace(email)) return;

        using var scope = app.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<IUserRepository>();
        var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("PlatformAdminBootstrap");

        var all = await users.GetAllAsync();
        if (all.Any(u => (u.Role ?? "") == "PLATFORM_ADMIN" && (u.Status ?? 1) == 1))
        {
            logger.LogInformation("Platform administrator already exists; bootstrap skipped.");
            return;
        }

        var target = await users.GetByEmailAsync(email.Trim());
        if (target is null)
        {
            logger.LogWarning(
                "{ConfigKey} names an account that has not signed up yet; no administrator was created.",
                ConfigKey);
            return;
        }

        target.SetRole("PLATFORM_ADMIN");
        await users.UpdateUserAsync(target);
        logger.LogWarning(
            "SECURITY: user {UserId} was promoted to PLATFORM_ADMIN by first-admin bootstrap.",
            target.UserId);
    }

    /// <summary>
    /// Creates the development administrator if it is missing. Idempotent, and a hard no-op in
    /// Production: these credentials live in source control, so creating the account there would
    /// hand an administrator login to anyone who can read the repository.
    /// </summary>
    private static async Task SeedDevelopmentAdminAsync(WebApplication app)
    {
        var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("PlatformAdminBootstrap");

        if (app.Environment.IsProduction())
        {
            logger.LogInformation("Production environment: the built-in development administrator is not created.");
            return;
        }

        // Skipped under Testing for a subtler reason than tidiness: reading the database here would
        // materialise the EF in-memory store before a test calls EnsureCreated(), and EnsureCreated
        // is a no-op once the store exists — so the seeded plan catalog would silently never be
        // applied and every billing test would query an empty table.
        if (app.Environment.IsEnvironment("Testing"))
        {
            return;
        }

        using var scope = app.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<IUserRepository>();

        if (await users.GetByEmailAsync(DevAdminEmail) is not null) return;

        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        var admin = UserEntity.Create("Platform Admin", DevAdminEmail, hasher.Hash(DevAdminPassword), "PLATFORM_ADMIN");
        await users.AddUserAsync(admin);

        logger.LogWarning(
            "SECURITY: created the built-in development administrator {Email}. "
            + "It exists only outside Production and its password is public — never reuse it anywhere real.",
            DevAdminEmail);
    }
}
