using MediatR;
using Microsoft.Extensions.Options;
using TaskGenie.Application.Common.Options;
using TaskGenie.Application.Common.Security;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Auth.Commands;

public class ForgotPasswordCommandHandler(
    IUserRepository userRepository,
    IPasswordResetTokenRepository passwordResetTokenRepository,
    IEmailSender emailSender,
    IOptions<PasswordResetSettings> options)
    : IRequestHandler<ForgotPasswordCommand, ForgotPasswordResult>
{
    private const string GenericMessage =
        "Nếu email tồn tại trong hệ thống, một email đặt lại mật khẩu đã được gửi.";

    private readonly PasswordResetSettings _settings = options.Value;

    public async Task<ForgotPasswordResult> Handle(ForgotPasswordCommand request, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await userRepository.GetByEmailAsync(email, ct);

        // Always return the same generic message so the endpoint can't be used to enumerate
        // registered emails.
        if (user is null || user.Status != 1)
            return new ForgotPasswordResult(GenericMessage);

        await passwordResetTokenRepository.InvalidateActiveForUserAsync(user.UserId, ct);

        var raw = OpaqueTokenGenerator.GenerateRawToken();
        var expiresAt = DateTime.UtcNow.AddMinutes(_settings.TokenExpirationMinutes);
        var token = PasswordResetToken.Create(user.UserId, OpaqueTokenGenerator.Hash(raw), expiresAt);
        await passwordResetTokenRepository.AddAsync(token, ct);

        await emailSender.SendPasswordResetEmailAsync(user.Email, raw, ct);

        return new ForgotPasswordResult(GenericMessage);
    }
}
