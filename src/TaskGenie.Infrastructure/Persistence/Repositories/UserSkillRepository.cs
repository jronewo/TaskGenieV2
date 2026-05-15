using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class UserSkillRepository : IUserSkillRepository
{
    private readonly AppDbContext _context;

    public UserSkillRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<UserSkill?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        return await _context.UserSkills
            .Include(us => us.Skill)
            .Include(us => us.User)
            .FirstOrDefaultAsync(us => us.Id == id, ct);
    }

    public async Task<List<UserSkill>> GetByUserIdAsync(int userId, CancellationToken ct = default)
    {
        return await _context.UserSkills
            .Where(us => us.UserId == userId)
            .Include(us => us.Skill)
            .ToListAsync(ct);
    }

    public async Task AddAsync(UserSkill userSkill, CancellationToken ct = default)
    {
        await _context.UserSkills.AddAsync(userSkill, ct);
        await _context.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(UserSkill userSkill, CancellationToken ct = default)
    {
        _context.UserSkills.Update(userSkill);
        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var userSkill = await _context.UserSkills.FindAsync(new object[] { id }, ct);
        if (userSkill != null)
        {
            _context.UserSkills.Remove(userSkill);
            await _context.SaveChangesAsync(ct);
        }
    }
}
