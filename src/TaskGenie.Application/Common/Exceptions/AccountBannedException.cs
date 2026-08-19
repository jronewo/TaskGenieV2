namespace TaskGenie.Application.Common.Exceptions;

/// <summary>
/// A suspended account tried to sign in. Carries the end date so the client can tell the person how
/// long it lasts instead of the flat "your account is locked" that leaves them with nothing to do.
/// </summary>
public sealed class AccountBannedException(DateTime? bannedUntil, string? reason)
    : Exception(BuildMessage(bannedUntil))
{
    public DateTime? BannedUntil { get; } = bannedUntil;

    public string? Reason { get; } = reason;

    public bool IsPermanent => bannedUntil is null;

    private static string BuildMessage(DateTime? until) => until is DateTime date
        ? $"Tài khoản của bạn bị tạm khóa đến {date:dd/MM/yyyy HH:mm} (UTC)."
        : "Tài khoản của bạn đã bị khóa vĩnh viễn.";
}
