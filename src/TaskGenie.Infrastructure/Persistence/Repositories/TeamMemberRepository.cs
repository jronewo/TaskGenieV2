using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class TeamMemberRepository : ITeamMemberRepository
{
    private readonly AppDbContext _context;

    public TeamMemberRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<TeamMember?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        return await _context.TeamMembers
            .Include(tm => tm.User)
            .Include(tm => tm.Team)
            .FirstOrDefaultAsync(tm => tm.Id == id, ct);
    }

    public async Task<List<TeamMember>> GetByTeamIdAsync(int teamId, CancellationToken ct = default)
    {
        return await _context.TeamMembers
            .Where(tm => tm.TeamId == teamId)
            .Include(tm => tm.User)
            .ToListAsync(ct);
    }

    public async Task<List<TeamMember>> GetByUserIdAsync(int userId, CancellationToken ct = default)
    {
        return await _context.TeamMembers
            .Where(tm => tm.UserId == userId)
            .Include(tm => tm.Team)
            .ToListAsync(ct);
    }

    public async Task AddAsync(TeamMember teamMember, CancellationToken ct = default)
    {
        await _context.TeamMembers.AddAsync(teamMember, ct);
        await _context.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(TeamMember teamMember, CancellationToken ct = default)
    {
        _context.TeamMembers.Update(teamMember);
        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var teamMember = await _context.TeamMembers.FindAsync(new object[] { id }, ct);
        if (teamMember != null)
        {
            _context.TeamMembers.Remove(teamMember);
            await _context.SaveChangesAsync(ct);
        }
    }
}
