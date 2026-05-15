using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class TeamRepository : ITeamRepository
{
    private readonly AppDbContext _context;

    public TeamRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Team?> GetByIdAsync(int teamId, CancellationToken ct = default)
    {
        return await _context.Teams
            .Include(t => t.TeamMembers)
            .ThenInclude(tm => tm.User)
            .Include(t => t.Projects)
            .FirstOrDefaultAsync(t => t.TeamId == teamId, ct);
    }

    public async Task<List<Team>> GetAllAsync(CancellationToken ct = default)
    {
        return await _context.Teams
            .Include(t => t.CreatedByNavigation)
            .Include(t => t.TeamMembers)
            .ThenInclude(tm => tm.User)
            .ToListAsync(ct);
    }

    public async Task<List<Team>> GetTeamsByCreatorIdAsync(int userId, CancellationToken ct = default)
    {
        return await _context.Teams
            .Where(t => t.CreatedBy == userId)
            .Include(t => t.TeamMembers)
            .ToListAsync(ct);
    }

    public async Task AddAsync(Team team, CancellationToken ct = default)
    {
        await _context.Teams.AddAsync(team, ct);
        await _context.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(Team team, CancellationToken ct = default)
    {
        _context.Teams.Update(team);
        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int teamId, CancellationToken ct = default)
    {
        var team = await _context.Teams.FindAsync(new object[] { teamId }, ct);
        if (team != null)
        {
            _context.Teams.Remove(team);
            await _context.SaveChangesAsync(ct);
        }
    }
}
