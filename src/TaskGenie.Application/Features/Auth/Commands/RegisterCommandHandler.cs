using MediatR;
using TaskGenie.Application.Features.Auth.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Auth.Commands;

public class RegisterCommandHandler(
    IUserRepository userRepository,
    IPasswordHasher passwordHasher,
    IAuthTokenIssuer authTokenIssuer)
    : IRequestHandler<RegisterCommand, AuthResponse>
{
    public async Task<AuthResponse> Handle(RegisterCommand request, CancellationToken ct)
    {
        var existing = await userRepository.GetByEmailAsync(request.Email, ct);
        if (existing != null)
            throw new InvalidOperationException("Email này đã được sử dụng.");

        var user = User.Create(
            request.Name,
            request.Email,
            passwordHasher.Hash(request.Password));

        await userRepository.AddUserAsync(user, ct);
        return await authTokenIssuer.IssueAsync(user, "Đăng ký thành công", ct);
    }
}
