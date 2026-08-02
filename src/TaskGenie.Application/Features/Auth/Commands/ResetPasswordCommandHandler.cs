using MediatR;
using TaskGenie.Application.Common.Security;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Auth.Commands;

public class ResetPasswordCommandHandler(
    IPasswordResetTokenRepository passwordResetTokenRepository,
    IUserRepository userRepository,
    IPasswordHasher passwordHasher,
    IRefreshTokenService refreshTokenService)
    : IRequestHandler<ResetPasswordCommand, ResetPasswordResult>
{
    public async Task<ResetPasswordResult> Handle(ResetPasswordCommand request, CancellationToken ct)
    {
        var token = await passwordResetTokenRepository.GetByTokenHashAsync(OpaqueTokenGenerator.Hash(request.Token), ct);
        if (token is null || !token.IsUsable)
            throw new UnauthorizedAccessException("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");

        var user = await userRepository.GetByIdAsync(token.UserId, ct);
        if (user is null || user.Status != 1)
            throw new UnauthorizedAccessException("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");

        user.ChangePassword(passwordHasher.Hash(request.NewPassword));
        await userRepository.UpdateUserAsync(user, ct);

        token.MarkUsed();
        await passwordResetTokenRepository.UpdateAsync(token, ct);

        // Force re-login on every device/session since the credential just changed.
        await refreshTokenService.RevokeAllForUserAsync(user.UserId, ct);

        return new ResetPasswordResult("Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.");
    }
}
