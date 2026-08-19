using TaskGenie.Domain.Interfaces.Repositories;

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

    public static async Task BootstrapPlatformAdminAsync(this WebApplication app)
    {
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
}
