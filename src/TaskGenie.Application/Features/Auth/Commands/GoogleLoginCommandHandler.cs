using MediatR;
using TaskGenie.Application.Features.Auth.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Auth.Commands;

public class GoogleLoginCommandHandler(
    IGoogleAuthService googleAuthService,
    IUserRepository userRepository,
    IPasswordHasher passwordHasher,
    IAuthTokenIssuer authTokenIssuer)
    : IRequestHandler<GoogleLoginCommand, AuthResponse>
{
    public async Task<AuthResponse> Handle(GoogleLoginCommand request, CancellationToken ct)
    {
        var googleUser = await googleAuthService.VerifyTokenAsync(request.IdToken)
            ?? throw new UnauthorizedAccessException("Token Google không hợp lệ.");

        if (string.IsNullOrWhiteSpace(googleUser.Email))
            throw new UnauthorizedAccessException("Google không trả về email cho tài khoản này.");

        var user = await userRepository.GetByEmailAsync(googleUser.Email, ct);

        if (user == null)
        {
            var displayName = !string.IsNullOrWhiteSpace(googleUser.Name)
                ? googleUser.Name
                : googleUser.Email.Split('@')[0];

            user = User.Create(
                displayName,
                googleUser.Email,
                passwordHasher.Hash(Guid.NewGuid().ToString()),
                avatar: googleUser.Picture);

            await userRepository.AddUserAsync(user, ct);
        }
        else if (user.Status != 1)
        {
            throw new UnauthorizedAccessException("Tài khoản của bạn đã bị khóa.");
        }

        return await authTokenIssuer.IssueAsync(user, "Đăng nhập Google thành công", ct);
    }
}
