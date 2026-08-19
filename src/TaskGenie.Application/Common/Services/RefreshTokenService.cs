using Microsoft.Extensions.Options;
using TaskGenie.Application.Common.Options;
using TaskGenie.Application.Common.Security;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Common.Services;

public sealed class RefreshTokenService(
    IRefreshTokenRepository refreshTokenRepository,
    IOptions<JwtSettings> jwtOptions) : IRefreshTokenService
{
    private readonly JwtSettings _settings = jwtOptions.Value;

    public async System.Threading.Tasks.Task<IssuedRefreshToken> IssueAsync(int userId, CancellationToken ct = default)
    {
        var raw = OpaqueTokenGenerator.GenerateRawToken();
        var expiresAt = DateTime.UtcNow.AddDays(_settings.RefreshTokenExpirationDays);
        var token = RefreshToken.Create(userId, Guid.NewGuid(), OpaqueTokenGenerator.Hash(raw), expiresAt);
        await refreshTokenRepository.AddAsync(token, ct);
        return new IssuedRefreshToken(raw, expiresAt);
    }

    public async System.Threading.Tasks.Task<RotatedRefreshToken> RotateAsync(string rawToken, CancellationToken ct = default)
    {
        var existing = await refreshTokenRepository.GetByTokenHashAsync(OpaqueTokenGenerator.Hash(rawToken), ct)
            ?? throw new UnauthorizedAccessException("Invalid refresh token.");

        if (existing.RevokedAtUtc is not null)
        {
            // The token was already rotated away once; presenting it again means it leaked.
            // Kill the whole family so a stolen token can't keep riding the rotation chain.
            await refreshTokenRepository.RevokeFamilyAsync(existing.FamilyId, ct);
            throw new UnauthorizedAccessException("Refresh token has already been used. Session revoked.");
        }

        if (existing.ExpiresAtUtc <= DateTime.UtcNow)
            throw new UnauthorizedAccessException("Refresh token expired.");

        var raw = OpaqueTokenGenerator.GenerateRawToken();
        var expiresAt = DateTime.UtcNow.AddDays(_settings.RefreshTokenExpirationDays);
        var next = RefreshToken.Create(existing.UserId, existing.FamilyId, OpaqueTokenGenerator.Hash(raw), expiresAt);
        await refreshTokenRepository.AddAsync(next, ct);

        existing.Revoke(next.RefreshTokenId);
        await refreshTokenRepository.UpdateAsync(existing, ct);

        return new RotatedRefreshToken(existing.UserId, new IssuedRefreshToken(raw, expiresAt));
    }

    public async System.Threading.Tasks.Task RevokeAsync(string rawToken, CancellationToken ct = default)
    {
        var existing = await refreshTokenRepository.GetByTokenHashAsync(OpaqueTokenGenerator.Hash(rawToken), ct);
        if (existing is null) return;
        await refreshTokenRepository.RevokeFamilyAsync(existing.FamilyId, ct);
    }

    public System.Threading.Tasks.Task RevokeAllForUserAsync(int userId, CancellationToken ct = default)
        => refreshTokenRepository.RevokeAllForUserAsync(userId, ct);
}
