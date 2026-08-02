using TaskGenie.Application.Common.Exceptions;
using MediatR;
using TaskGenie.Application.Features.Auth.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Auth.Commands;

public class RefreshTokenCommandHandler(
    IRefreshTokenService refreshTokenService,
    IUserRepository userRepository,
    IOrganizationRepository organizationRepository,
    IJwtTokenService jwtTokenService)
    : IRequestHandler<RefreshTokenCommand, AuthResponse>
{
    public async Task<AuthResponse> Handle(RefreshTokenCommand request, CancellationToken ct)
    {
        var rotated = await refreshTokenService.RotateAsync(request.RefreshToken, ct);

        var user = await userRepository.GetByIdAsync(rotated.UserId, ct)
            ?? throw new UnauthorizedAccessException("User no longer exists.");
        // A temporary ban lifts itself the moment the person tries to use the account again —
        // cheaper and more predictable than a scheduled job racing the login.
        if (user.LiftBanIfExpired(DateTime.UtcNow))
            await userRepository.UpdateUserAsync(user, ct);

        if (user.Status != 1)
            throw new AccountBannedException(user.BannedUntil, user.BanReason);

        var skills = await userRepository.GetUserSkillsAsync(user.UserId, ct);
        var isOrgOwner = await organizationRepository.GetByOwnerIdAsync(user.UserId, ct) != null;
        var role = user.Role ?? "NORMAL_USER";
        var accessToken = jwtTokenService.GenerateToken(user.UserId, user.Email, role);

        return new AuthResponse(
            user.UserId,
            user.Name,
            user.Email,
            role,
            user.Avatar,
            skills.Count == 0,
            isOrgOwner,
            accessToken.AccessToken,
            accessToken.ExpiresAtUtc,
            rotated.NewToken.RawToken,
            rotated.NewToken.ExpiresAtUtc,
            "Token refreshed.");
    }
}
