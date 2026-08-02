using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Users.Commands;

public class ChangePasswordCommandHandler(
    ICurrentUser currentUser,
    IUserRepository userRepository,
    IPasswordHasher passwordHasher,
    IRefreshTokenService refreshTokenService)
    : IRequestHandler<ChangePasswordCommand, bool>
{
    public async Task<bool> Handle(ChangePasswordCommand request, CancellationToken ct)
    {
        var user = await userRepository.GetByIdAsync(currentUser.UserId, ct)
            ?? throw new NotFoundException("User", currentUser.UserId);

        if (!passwordHasher.Verify(request.CurrentPassword, user.Password ?? ""))
            throw new UnauthorizedAccessException("Mật khẩu hiện tại không đúng.");

        user.ChangePassword(passwordHasher.Hash(request.NewPassword));
        await userRepository.UpdateUserAsync(user, ct);

        // The credential just changed — drop every outstanding session so a stolen refresh token
        // from before the change can't keep the account alive.
        await refreshTokenService.RevokeAllForUserAsync(user.UserId, ct);
        return true;
    }
}
