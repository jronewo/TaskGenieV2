using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Admin.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Admin.Commands;

public sealed record UpdateUserPlatformRoleCommand(int UserId, string Role) : IRequest<AdminUserDto>;

public sealed class UpdateUserPlatformRoleCommandHandler(IUserRepository userRepo)
    : IRequestHandler<UpdateUserPlatformRoleCommand, AdminUserDto>
{
    private static readonly HashSet<string> ValidRoles = new(StringComparer.Ordinal) { "PLATFORM_ADMIN", "NORMAL_USER" };

    public async Task<AdminUserDto> Handle(UpdateUserPlatformRoleCommand cmd, CancellationToken ct)
    {
        var user = await userRepo.GetByIdAsync(cmd.UserId, ct)
            ?? throw new NotFoundException("User", cmd.UserId);

        var newRole = (cmd.Role ?? string.Empty).ToUpperInvariant();
        if (!ValidRoles.Contains(newRole))
            throw new InvalidOperationException($"'{cmd.Role}' is not a valid platform role.");

        if (newRole != "PLATFORM_ADMIN")
            await AdminUserGuard.EnsureNotRemovingLastActiveAdminAsync(userRepo, user, ct);

        user.SetRole(newRole);
        await userRepo.UpdateUserAsync(user, ct);

        return AdminUserDto.FromEntity(user);
    }
}
