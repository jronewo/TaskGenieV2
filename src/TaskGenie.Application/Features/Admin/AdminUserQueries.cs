using FluentValidation;
using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Application.Features.Admin;

public sealed record AdminUserDto(
    int UserId, string Name, string Email, string? Avatar, string Role, int Status, DateTime? CreatedAt,
    DateTime? BannedUntil = null, string? BanReason = null)
{
    public static AdminUserDto From(Domain.Entities.User user) => new(
        user.UserId, user.Name, user.Email, user.Avatar,
        user.Role ?? "NORMAL_USER", user.Status ?? 1, user.CreatedAt,
        user.BannedUntil, user.BanReason);
}

public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);

// ── List / search users ──────────────────────────────────────────────────────────────

public sealed record AdminSearchUsersQuery(string? Search, int Page = 1, int PageSize = 20)
    : IRequest<PagedResult<AdminUserDto>>;

public sealed class AdminSearchUsersQueryHandler(IUserRepository userRepo)
    : IRequestHandler<AdminSearchUsersQuery, PagedResult<AdminUserDto>>
{
    public async Task<PagedResult<AdminUserDto>> Handle(AdminSearchUsersQuery query, CancellationToken ct)
    {
        var all = await userRepo.GetAllAsync(ct);

        var filtered = string.IsNullOrWhiteSpace(query.Search)
            ? all
            : all.Where(u =>
                (u.Name ?? "").Contains(query.Search, StringComparison.OrdinalIgnoreCase) ||
                (u.Email ?? "").Contains(query.Search, StringComparison.OrdinalIgnoreCase)).ToList();

        var page = Math.Max(1, query.Page);
        var size = Math.Clamp(query.PageSize, 1, 100);

        var items = filtered
            .OrderByDescending(u => u.UserId)
            .Skip((page - 1) * size)
            .Take(size)
            .Select(u => new AdminUserDto(
                u.UserId, u.Name, u.Email, u.Avatar, u.Role ?? "NORMAL_USER", u.Status ?? 1, u.CreatedAt))
            .ToList();

        return new PagedResult<AdminUserDto>(items, filtered.Count, page, size);
    }
}

// ── Change status (activate / deactivate) ────────────────────────────────────────────

public sealed record AdminSetUserStatusCommand(int UserId, int Status) : IRequest<AdminUserDto>;

/// <summary>
/// Suspends an account. <paramref name="Days"/> null means permanent; otherwise the ban lifts
/// automatically once the date passes. Banning is preferred over deletion because the person's
/// work — tasks, comments, evaluations — stays attached to a real account rather than orphaned.
/// </summary>
public sealed record AdminBanUserCommand(int UserId, int? Days, string? Reason) : IRequest<AdminUserDto>;

public sealed class AdminBanUserCommandValidator : AbstractValidator<AdminBanUserCommand>
{
    public AdminBanUserCommandValidator()
    {
        RuleFor(c => c.Days)
            .InclusiveBetween(1, 3650)
            .When(c => c.Days.HasValue)
            .WithMessage("A temporary ban must be between 1 and 3650 days.");

        RuleFor(c => c.Reason).MaximumLength(300);
    }
}

public sealed class AdminBanUserCommandHandler(
    ICurrentUser currentUser,
    IUserRepository userRepo,
    IRefreshTokenService refreshTokenService)
    : IRequestHandler<AdminBanUserCommand, AdminUserDto>
{
    public async Task<AdminUserDto> Handle(AdminBanUserCommand cmd, CancellationToken ct)
    {
        var user = await userRepo.GetByIdAsync(cmd.UserId, ct)
            ?? throw new NotFoundException("User", cmd.UserId);

        if (cmd.UserId == currentUser.UserId)
            throw new InvalidOperationException("You cannot ban your own account.");

        if ((user.Role ?? "") == "PLATFORM_ADMIN")
            await AdminSetUserStatusCommandHandler.EnsureNotLastActiveAdminAsync(userRepo, cmd.UserId, ct);

        user.Ban(cmd.Days is int days ? DateTime.UtcNow.AddDays(days) : null, cmd.Reason);
        await userRepo.UpdateUserAsync(user, ct);

        // A banned account must lose its live sessions immediately, or it keeps working until the
        // access token expires.
        await refreshTokenService.RevokeAllForUserAsync(cmd.UserId, ct);

        return AdminUserDto.From(user);
    }
}

public sealed class AdminSetUserStatusCommandHandler(
    ICurrentUser currentUser,
    IUserRepository userRepo,
    IRefreshTokenService refreshTokenService)
    : IRequestHandler<AdminSetUserStatusCommand, AdminUserDto>
{
    public async Task<AdminUserDto> Handle(AdminSetUserStatusCommand cmd, CancellationToken ct)
    {
        var user = await userRepo.GetByIdAsync(cmd.UserId, ct)
            ?? throw new NotFoundException("User", cmd.UserId);

        if (cmd.UserId == currentUser.UserId && cmd.Status != 1)
            throw new InvalidOperationException("You cannot deactivate your own account.");

        if (cmd.Status != 1 && (user.Role ?? "") == "PLATFORM_ADMIN")
            await EnsureNotLastActiveAdminAsync(userRepo, cmd.UserId, ct);

        // Reactivating clears the suspension entirely, rather than leaving a stale end date behind.
        if (cmd.Status == 1) user.Unban();
        else user.SetStatus(cmd.Status);

        await userRepo.UpdateUserAsync(user, ct);

        // A deactivated account must lose its live sessions immediately.
        if (cmd.Status != 1) await refreshTokenService.RevokeAllForUserAsync(cmd.UserId, ct);

        // Reactivating clears the suspension entirely, rather than leaving a stale end date behind.
        if (cmd.Status == 1) user.Unban();

        return AdminUserDto.From(user);
    }

    internal static async Task EnsureNotLastActiveAdminAsync(IUserRepository repo, int userId, CancellationToken ct)
    {
        var all = await repo.GetAllAsync(ct);
        var activeAdmins = all.Count(u => (u.Role ?? "") == "PLATFORM_ADMIN" && (u.Status ?? 1) == 1);
        var target = all.FirstOrDefault(u => u.UserId == userId);
        if (target is not null && (target.Role ?? "") == "PLATFORM_ADMIN" && activeAdmins <= 1)
            throw new InvalidOperationException("The platform must keep at least one active administrator.");
    }
}

// ── Change platform role ─────────────────────────────────────────────────────────────

public sealed record AdminSetUserRoleCommand(int UserId, string Role) : IRequest<AdminUserDto>;

public sealed class AdminSetUserRoleCommandHandler(IUserRepository userRepo)
    : IRequestHandler<AdminSetUserRoleCommand, AdminUserDto>
{
    private static readonly string[] AllowedRoles = ["NORMAL_USER", "PLATFORM_ADMIN"];

    public async Task<AdminUserDto> Handle(AdminSetUserRoleCommand cmd, CancellationToken ct)
    {
        if (!AllowedRoles.Contains(cmd.Role))
            throw new InvalidOperationException("Role must be NORMAL_USER or PLATFORM_ADMIN.");

        var user = await userRepo.GetByIdAsync(cmd.UserId, ct)
            ?? throw new NotFoundException("User", cmd.UserId);

        // Never strip the platform of its final administrator.
        if (cmd.Role != "PLATFORM_ADMIN")
            await AdminSetUserStatusCommandHandler.EnsureNotLastActiveAdminAsync(userRepo, cmd.UserId, ct);

        user.SetRole(cmd.Role);
        await userRepo.UpdateUserAsync(user, ct);

        return AdminUserDto.From(user);
    }
}
