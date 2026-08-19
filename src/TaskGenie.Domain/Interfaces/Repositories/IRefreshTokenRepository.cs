using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface IRefreshTokenRepository
{
    System.Threading.Tasks.Task AddAsync(RefreshToken token, CancellationToken ct = default);
    System.Threading.Tasks.Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken ct = default);
    System.Threading.Tasks.Task UpdateAsync(RefreshToken token, CancellationToken ct = default);

    /// <summary>Revokes every currently-active token in the given family (used on rotation reuse
    /// detection and on logout).</summary>
    System.Threading.Tasks.Task RevokeFamilyAsync(Guid familyId, CancellationToken ct = default);

    /// <summary>Revokes every currently-active token for the user across all families (used when
    /// the password changes, to force re-login on every device).</summary>
    System.Threading.Tasks.Task RevokeAllForUserAsync(int userId, CancellationToken ct = default);
}
