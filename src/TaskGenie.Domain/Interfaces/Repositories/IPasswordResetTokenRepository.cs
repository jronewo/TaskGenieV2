using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface IPasswordResetTokenRepository
{
    System.Threading.Tasks.Task AddAsync(PasswordResetToken token, CancellationToken ct = default);
    System.Threading.Tasks.Task<PasswordResetToken?> GetByTokenHashAsync(string tokenHash, CancellationToken ct = default);
    System.Threading.Tasks.Task UpdateAsync(PasswordResetToken token, CancellationToken ct = default);

    /// <summary>Marks every currently-usable reset token for the user as used, so an old
    /// forgot-password email can't be replayed after a newer one was requested.</summary>
    System.Threading.Tasks.Task InvalidateActiveForUserAsync(int userId, CancellationToken ct = default);
}
