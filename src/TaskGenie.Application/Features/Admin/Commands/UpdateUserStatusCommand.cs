using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Admin.DTOs;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Admin.Commands;

public sealed record UpdateUserStatusCommand(int UserId, int Status) : IRequest<AdminUserDto>;

public sealed class UpdateUserStatusCommandHandler(IUserRepository userRepo)
    : IRequestHandler<UpdateUserStatusCommand, AdminUserDto>
{
    public async Task<AdminUserDto> Handle(UpdateUserStatusCommand cmd, CancellationToken ct)
    {
        var user = await userRepo.GetByIdAsync(cmd.UserId, ct)
            ?? throw new NotFoundException("User", cmd.UserId);

        if (cmd.Status != UserStatus.Active)
            await AdminUserGuard.EnsureNotRemovingLastActiveAdminAsync(userRepo, user, ct);

        user.SetStatus(cmd.Status);
        await userRepo.UpdateUserAsync(user, ct);

        return AdminUserDto.FromEntity(user);
    }
}
