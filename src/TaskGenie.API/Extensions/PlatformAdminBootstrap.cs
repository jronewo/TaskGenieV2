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

    /// <summary>
    /// Opt-in switch that lets Production create the built-in administrator too, with a password
    /// supplied by configuration rather than the one in this file.
    ///
    /// Off by default and deliberately awkward to turn on: a live deployment with a known
    /// administrator login is reachable by anyone who finds the URL. Set
    /// <c>Bootstrap:SeedAdminInProduction=true</c> and <c>Bootstrap:SeedAdminPassword</c> only for
    /// a short-lived demo, and change the password afterwards.
    /// </summary>
    private const string SeedInProductionKey = "Bootstrap:SeedAdminInProduction";
    private const string SeedPasswordKey = "Bootstrap:SeedAdminPassword";

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

        var seedInProduction = app.Configuration.GetValue(SeedInProductionKey, false);
        if (app.Environment.IsProduction() && !seedInProduction)
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

        // Outside Production the password in this file is fine — it is public anyway. In
        // Production it must come from configuration, so the live credential is never the one
        // written in source control.
        var password = app.Environment.IsProduction()
            ? app.Configuration[SeedPasswordKey]
            : DevAdminPassword;

        if (string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning(
                "{Key} is on but {PasswordKey} is empty; no administrator was created.",
                SeedInProductionKey, SeedPasswordKey);
            return;
        }

        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        var admin = UserEntity.Create("Platform Admin", DevAdminEmail, hasher.Hash(password), "PLATFORM_ADMIN");
        await users.AddUserAsync(admin);

        logger.LogWarning(
            "SECURITY: created the built-in administrator {Email}. Change its password before this "
            + "deployment is used for anything real.",
            DevAdminEmail);
    }
}
