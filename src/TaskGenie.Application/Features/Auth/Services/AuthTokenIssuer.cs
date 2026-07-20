using TaskGenie.Application.Features.Auth.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Auth.Services;

public class AuthTokenIssuer(
    IUserRepository userRepository,
    IOrganizationRepository organizationRepository,
    IJwtTokenService jwtTokenService) : IAuthTokenIssuer
{
    public async Task<AuthResponse> IssueAsync(User user, string message, CancellationToken ct = default)
    {
        var skills = await userRepository.GetUserSkillsAsync(user.UserId, ct);
        var isFirstLogin = skills.Count == 0;
        var isOrgOwner = await organizationRepository.GetByOwnerIdAsync(user.UserId, ct) != null;
        var role = user.Role ?? "NORMAL_USER";
        var token = jwtTokenService.GenerateToken(user.UserId, user.Email, role);

        return new AuthResponse(
            user.UserId,
            user.Name,
            user.Email,
            role,
            isFirstLogin,
            isOrgOwner,
            token.AccessToken,
            token.ExpiresAtUtc,
            message);
    }
}
