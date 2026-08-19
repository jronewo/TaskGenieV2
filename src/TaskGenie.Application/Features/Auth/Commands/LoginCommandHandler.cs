using TaskGenie.Application.Common.Exceptions;
using MediatR;
using TaskGenie.Application.Features.Auth.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Auth.Commands;

public class LoginCommandHandler(
    IUserRepository userRepository,
    IPasswordHasher passwordHasher,
    IAuthTokenIssuer authTokenIssuer)
    : IRequestHandler<LoginCommand, AuthResponse>
{
    public async Task<AuthResponse> Handle(LoginCommand request, CancellationToken ct)
    {
        // Suspended accounts must be found here, or the status check below never runs.
        var user = await userRepository.GetByEmailIncludingSuspendedAsync(request.Email, ct);

        if (user == null || !passwordHasher.Verify(request.Password, user.Password ?? ""))
            throw new UnauthorizedAccessException("Email hoặc mật khẩu không đúng.");

        // A temporary ban lifts itself the moment the person tries to use the account again —
        // cheaper and more predictable than a scheduled job racing the login.
        if (user.LiftBanIfExpired(DateTime.UtcNow))
            await userRepository.UpdateUserAsync(user, ct);

        if (user.Status != 1)
            throw new AccountBannedException(user.BannedUntil, user.BanReason);

        return await authTokenIssuer.IssueAsync(user, "Đăng nhập thành công", ct);
    }
}
