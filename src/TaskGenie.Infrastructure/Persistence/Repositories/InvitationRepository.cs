using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class InvitationRepository : IInvitationRepository
{
    private readonly AppDbContext _context;

    public InvitationRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Invitation?> GetByIdAsync(int invitationId, CancellationToken ct = default)
    {
        return await _context.Invitations
            .Include(i => i.Team)
            .FirstOrDefaultAsync(i => i.InvitationId == invitationId, ct);
    }

    public async Task<List<Invitation>> GetByTeamIdAsync(int teamId, CancellationToken ct = default)
    {
        return await _context.Invitations
            .Where(i => i.TeamId == teamId)
            .OrderByDescending(i => i.InvitationId)
            .ToListAsync(ct);
    }

    public async Task<List<Invitation>> GetByEmailAsync(string email, CancellationToken ct = default)
    {
        return await _context.Invitations
            .Where(i => i.Email == email)
            .Include(i => i.Team)
            .ToListAsync(ct);
    }

    public async Task AddAsync(Invitation invitation, CancellationToken ct = default)
    {
        await _context.Invitations.AddAsync(invitation, ct);
        await _context.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(Invitation invitation, CancellationToken ct = default)
    {
        _context.Invitations.Update(invitation);
        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int invitationId, CancellationToken ct = default)
    {
        var invitation = await _context.Invitations.FindAsync(new object[] { invitationId }, ct);
        if (invitation != null)
        {
            _context.Invitations.Remove(invitation);
            await _context.SaveChangesAsync(ct);
        }
    }
}
