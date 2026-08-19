using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class RefreshTokenRepository(AppDbContext context) : IRefreshTokenRepository
{
    public async System.Threading.Tasks.Task AddAsync(RefreshToken token, CancellationToken ct = default)
    {
        await context.RefreshTokens.AddAsync(token, ct);
        await context.SaveChangesAsync(ct);
    }

    public async System.Threading.Tasks.Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken ct = default)
    {
        return await context.RefreshTokens.SingleOrDefaultAsync(t => t.TokenHash == tokenHash, ct);
    }

    public async System.Threading.Tasks.Task UpdateAsync(RefreshToken token, CancellationToken ct = default)
    {
        context.RefreshTokens.Update(token);
        await context.SaveChangesAsync(ct);
    }

    public async System.Threading.Tasks.Task RevokeFamilyAsync(Guid familyId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var active = await context.RefreshTokens
            .Where(t => t.FamilyId == familyId && t.RevokedAtUtc == null)
            .ToListAsync(ct);

        foreach (var token in active)
            token.Revoke();

        if (active.Count > 0)
            await context.SaveChangesAsync(ct);
    }

    public async System.Threading.Tasks.Task RevokeAllForUserAsync(int userId, CancellationToken ct = default)
    {
        var active = await context.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAtUtc == null)
            .ToListAsync(ct);

        foreach (var token in active)
            token.Revoke();

        if (active.Count > 0)
            await context.SaveChangesAsync(ct);
    }
}
