using System;

namespace TaskGenie.Domain.Entities;

/// <summary>A one-time password reset token. The raw secret is emailed to the user and never
/// persisted; only its SHA-256 hash is stored so a leaked database cannot be used to reset
/// passwords.</summary>
public class PasswordResetToken
{
    protected PasswordResetToken() { }

    public int PasswordResetTokenId { get; internal set; }

    public int UserId { get; internal set; }

    public string TokenHash { get; internal set; } = null!;

    public DateTime ExpiresAtUtc { get; internal set; }

    public DateTime CreatedAtUtc { get; internal set; }

    public DateTime? UsedAtUtc { get; internal set; }

    public virtual User? User { get; internal set; }

    public bool IsUsable => UsedAtUtc is null && ExpiresAtUtc > DateTime.UtcNow;

    public static PasswordResetToken Create(int userId, string tokenHash, DateTime expiresAtUtc)
        => new() { UserId = userId, TokenHash = tokenHash, ExpiresAtUtc = expiresAtUtc, CreatedAtUtc = DateTime.UtcNow };

    public void MarkUsed() => UsedAtUtc = DateTime.UtcNow;
}
