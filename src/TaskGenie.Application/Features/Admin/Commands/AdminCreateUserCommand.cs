using MediatR;
using TaskGenie.Application.Features.Admin.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Admin.Commands;

public sealed record AdminCreateUserCommand(
    string Name,
    string Email,
    string Password,
    string Role
) : IRequest<AdminUserDto>;

public sealed class AdminCreateUserCommandHandler(
    IUserRepository userRepo,
    IPasswordHasher passwordHasher
) : IRequestHandler<AdminCreateUserCommand, AdminUserDto>
{
    private static readonly HashSet<string> ValidRoles = new(StringComparer.Ordinal) { "PLATFORM_ADMIN", "NORMAL_USER" };

    public async Task<AdminUserDto> Handle(AdminCreateUserCommand cmd, CancellationToken ct)
    {
        var existing = await userRepo.GetByEmailAsync(cmd.Email, ct);
        if (existing is not null)
            throw new InvalidOperationException("This email is already in use.");

        var role = string.IsNullOrWhiteSpace(cmd.Role) ? "NORMAL_USER" : cmd.Role.ToUpperInvariant();
        if (!ValidRoles.Contains(role))
            throw new InvalidOperationException($"'{cmd.Role}' is not a valid platform role.");

        var user = User.Create(cmd.Name, cmd.Email, passwordHasher.Hash(cmd.Password), role);
        await userRepo.AddUserAsync(user, ct);

        return AdminUserDto.FromEntity(user);
    }
}
