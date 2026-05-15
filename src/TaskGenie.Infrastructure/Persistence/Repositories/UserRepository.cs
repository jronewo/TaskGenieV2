using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _context;

    public UserRepository(AppDbContext context)
    {
        _context = context;
    }

    public async System.Threading.Tasks.Task<User?> GetByIdAsync(int userId, CancellationToken ct = default)
    {
        return await _context.Users.FindAsync(new object[] { userId }, ct);
    }

    public async System.Threading.Tasks.Task<List<User>> GetAllAsync(CancellationToken ct = default)
    {
        return await _context.Users
            .Where(u => u.Status == 1 && u.DeletedAt == null)
            .ToListAsync(ct);
    }

    public async System.Threading.Tasks.Task<User?> GetByEmailAsync(string email, CancellationToken ct = default)
    {
        return await _context.Users.SingleOrDefaultAsync(u => u.Email == email && u.Status == 1 && u.DeletedAt == null, ct);
    }

    public async System.Threading.Tasks.Task AddUserAsync(User user, CancellationToken ct = default)
    {
        await _context.Users.AddAsync(user, ct);
        await _context.SaveChangesAsync(ct);
    }

    public async System.Threading.Tasks.Task<List<User>> GetByTeamIdAsync(int teamId, CancellationToken ct = default)
    {
        return await _context.TeamMembers
            .Where(tm => tm.TeamId == teamId)
            .Include(tm => tm.User)
            .Select(tm => tm.User!)
            .Where(u => u.Status == 1 && u.DeletedAt == null)
            .ToListAsync(ct);
    }

    public async System.Threading.Tasks.Task<List<UserSkill>> GetUserSkillsAsync(int userId, CancellationToken ct = default)
    {
        return await _context.UserSkills
            .Where(us => us.UserId == userId)
            .Include(us => us.Skill)
            .ToListAsync(ct);
    }

    public async System.Threading.Tasks.Task<List<UserAvailability>> GetUserAvailabilityAsync(int userId, CancellationToken ct = default)
    {
        return await _context.UserAvailabilities
            .Where(ua => ua.UserId == userId)
            .ToListAsync(ct);
    }

    public async System.Threading.Tasks.Task<List<Evaluation>> GetUserEvaluationsAsync(int userId, CancellationToken ct = default)
    {
        return await _context.Evaluations
            .Where(e => e.UserId == userId)
            .ToListAsync(ct);
    }

    public async System.Threading.Tasks.Task<int> CountActiveTasksByUserAsync(int userId, CancellationToken ct = default)
    {
        return await _context.TaskAssignees
            .Where(ta => ta.UserId == userId)
            .Include(ta => ta.Task)
            .CountAsync(ta => ta.Task != null && ta.Task.Status != "Done" && ta.Task.Status != "Cancelled", ct);
    }

    public async System.Threading.Tasks.Task UpdateUserAsync(User user, CancellationToken ct = default)
    {
        _context.Users.Update(user);
        await _context.SaveChangesAsync(ct);
    }
}
