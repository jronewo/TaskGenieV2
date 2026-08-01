using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Application.Features.Admin;

/// <summary>Guards against ever leaving the platform with zero active PLATFORM_ADMIN accounts
/// — applies regardless of whether the acting admin is targeting themselves or someone else.</summary>
internal static class AdminUserGuard
{
    public static async Task EnsureNotRemovingLastActiveAdminAsync(
        IUserRepository userRepo,
        User target,
        CancellationToken ct)
    {
        if (target.Role != "PLATFORM_ADMIN") return;

        var allUsers = await userRepo.GetAllAsync(ct);
        var otherActiveAdmins = allUsers.Count(u =>
            u.UserId != target.UserId &&
            u.Role == "PLATFORM_ADMIN" &&
            (u.Status ?? UserStatus.Active) == UserStatus.Active &&
            u.DeletedAt is null);

        if (otherActiveAdmins == 0)
            throw new InvalidOperationException("Cannot remove or demote the last active platform admin.");
    }
}
