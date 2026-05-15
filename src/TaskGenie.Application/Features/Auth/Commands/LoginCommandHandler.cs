using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Auth.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Auth.Commands;

public class LoginCommandHandler(
    IUserRepository userRepository,
    IOrganizationRepository orgRepository,
    IPasswordHasher passwordHasher)
    : IRequestHandler<LoginCommand, AuthResponse>
{
    public async Task<AuthResponse> Handle(LoginCommand request, CancellationToken ct)
    {
        var user = await userRepository.GetByEmailAsync(request.Email, ct);

        if (user == null || !passwordHasher.Verify(request.Password, user.Password ?? ""))
            throw new UnauthorizedAccessException("Email hoặc mật khẩu không đúng.");

        if (user.Status != 1)
            throw new UnauthorizedAccessException("Tài khoản của bạn đã bị khóa.");

        var skills = await userRepository.GetUserSkillsAsync(user.UserId, ct);
        var isFirstLogin = skills == null || skills.Count == 0;

        var org = await orgRepository.GetByOwnerIdAsync(user.UserId, ct);
        var isOrgOwner = org != null;

        return new AuthResponse(
            user.UserId,
            user.Name,
            user.Email,
            user.Role ?? "NORMAL_USER",
            isFirstLogin,
            isOrgOwner,
            "Đăng nhập thành công");
    }
}
