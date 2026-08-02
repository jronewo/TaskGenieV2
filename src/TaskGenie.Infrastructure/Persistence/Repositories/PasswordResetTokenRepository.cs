using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class PasswordResetTokenRepository(AppDbContext context) : IPasswordResetTokenRepository
{
    public async System.Threading.Tasks.Task AddAsync(PasswordResetToken token, CancellationToken ct = default)
    {
        await context.PasswordResetTokens.AddAsync(token, ct);
        await context.SaveChangesAsync(ct);
    }

    public async System.Threading.Tasks.Task<PasswordResetToken?> GetByTokenHashAsync(string tokenHash, CancellationToken ct = default)
    {
        return await context.PasswordResetTokens.SingleOrDefaultAsync(t => t.TokenHash == tokenHash, ct);
    }

    public async System.Threading.Tasks.Task UpdateAsync(PasswordResetToken token, CancellationToken ct = default)
    {
        context.PasswordResetTokens.Update(token);
        await context.SaveChangesAsync(ct);
    }

    public async System.Threading.Tasks.Task InvalidateActiveForUserAsync(int userId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var active = await context.PasswordResetTokens
            .Where(t => t.UserId == userId && t.UsedAtUtc == null && t.ExpiresAtUtc > now)
            .ToListAsync(ct);

        foreach (var token in active)
            token.MarkUsed();

        if (active.Count > 0)
            await context.SaveChangesAsync(ct);
    }
}
