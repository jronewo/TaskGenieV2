using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Admin.Commands;

/// <summary>Soft-delete only (sets DeletedAt + Status=Inactive) — matches the existing
/// User.DeletedAt lifecycle field; no hard delete of user rows or their history.</summary>
public sealed record DeleteUserCommand(int UserId) : IRequest<bool>;

public sealed class DeleteUserCommandHandler(IUserRepository userRepo)
    : IRequestHandler<DeleteUserCommand, bool>
{
    public async Task<bool> Handle(DeleteUserCommand cmd, CancellationToken ct)
    {
        var user = await userRepo.GetByIdAsync(cmd.UserId, ct)
            ?? throw new NotFoundException("User", cmd.UserId);

        await AdminUserGuard.EnsureNotRemovingLastActiveAdminAsync(userRepo, user, ct);

        user.SoftDelete();
        await userRepo.UpdateUserAsync(user, ct);
        return true;
    }
}
