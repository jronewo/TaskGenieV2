using System;

namespace TaskGenie.Domain.Entities;

/// <summary>A rotating refresh token. Tokens form a family (FamilyId): each rotation revokes the
/// current row and inserts a new one in the same family. Presenting an already-revoked token is
/// treated as reuse/compromise and revokes the whole family.</summary>
public class RefreshToken
{
    protected RefreshToken() { }

    public int RefreshTokenId { get; internal set; }

    public int UserId { get; internal set; }

    public Guid FamilyId { get; internal set; }

    /// <summary>SHA-256 hash of the opaque token secret. The raw secret is never persisted.</summary>
    public string TokenHash { get; internal set; } = null!;

    public DateTime ExpiresAtUtc { get; internal set; }

    public DateTime CreatedAtUtc { get; internal set; }

    public DateTime? RevokedAtUtc { get; internal set; }

    public int? ReplacedByTokenId { get; internal set; }

    public virtual User? User { get; internal set; }

    public bool IsActive => RevokedAtUtc is null && ExpiresAtUtc > DateTime.UtcNow;

    public static RefreshToken Create(int userId, Guid familyId, string tokenHash, DateTime expiresAtUtc)
        => new()
        {
            UserId = userId,
            FamilyId = familyId,
            TokenHash = tokenHash,
            ExpiresAtUtc = expiresAtUtc,
            CreatedAtUtc = DateTime.UtcNow
        };

    public void Revoke(int? replacedByTokenId = null)
    {
        RevokedAtUtc = DateTime.UtcNow;
        ReplacedByTokenId = replacedByTokenId;
    }
}
