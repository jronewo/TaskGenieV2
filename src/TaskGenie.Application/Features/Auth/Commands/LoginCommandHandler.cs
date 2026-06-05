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
        var user = await userRepository.GetByEmailAsync(request.Email, ct);

        if (user == null || !passwordHasher.Verify(request.Password, user.Password ?? ""))
            throw new UnauthorizedAccessException("Email hoặc mật khẩu không đúng.");

        if (user.Status != 1)
            throw new UnauthorizedAccessException("Tài khoản của bạn đã bị khóa.");

        return await authTokenIssuer.IssueAsync(user, "Đăng nhập thành công", ct);
    }
}
