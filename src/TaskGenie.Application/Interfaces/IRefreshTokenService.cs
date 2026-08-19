namespace TaskGenie.Application.Interfaces;

public record IssuedRefreshToken(string RawToken, DateTime ExpiresAtUtc);

public record RotatedRefreshToken(int UserId, IssuedRefreshToken NewToken);

public interface IRefreshTokenService
{
    /// <summary>Starts a brand-new token family for the user (login/register/Google/refresh-family-reset).</summary>
    System.Threading.Tasks.Task<IssuedRefreshToken> IssueAsync(int userId, CancellationToken ct = default);

    /// <summary>Redeems a raw refresh token: revokes it and issues the next token in the same
    /// family. Throws <see cref="UnauthorizedAccessException"/> if the token is unknown, expired,
    /// or already used — in the reuse case the entire family is revoked as a compromise signal.</summary>
    System.Threading.Tasks.Task<RotatedRefreshToken> RotateAsync(string rawToken, CancellationToken ct = default);

    /// <summary>Revokes the family the given raw token belongs to (logout for that session). No-op
    /// if the token is unknown.</summary>
    System.Threading.Tasks.Task RevokeAsync(string rawToken, CancellationToken ct = default);

    /// <summary>Revokes every active refresh token for the user across all sessions/devices.</summary>
    System.Threading.Tasks.Task RevokeAllForUserAsync(int userId, CancellationToken ct = default);
}
