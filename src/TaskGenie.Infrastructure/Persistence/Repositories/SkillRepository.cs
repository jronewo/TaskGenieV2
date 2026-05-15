using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class SkillRepository : ISkillRepository
{
    private readonly AppDbContext _context;

    public SkillRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Skill?> GetByIdAsync(int skillId, CancellationToken ct = default)
    {
        return await _context.Skills
            .Include(s => s.UserSkills)
            .Include(s => s.TaskRequiredSkills)
            .FirstOrDefaultAsync(s => s.SkillId == skillId, ct);
    }

    public async Task<List<Skill>> GetAllAsync(CancellationToken ct = default)
    {
        return await _context.Skills.ToListAsync(ct);
    }

    public async Task<Skill?> GetByNameAsync(string skillName, CancellationToken ct = default)
    {
        return await _context.Skills
            .FirstOrDefaultAsync(s => s.SkillName.ToLower() == skillName.ToLower(), ct);
    }

    public async Task AddAsync(Skill skill, CancellationToken ct = default)
    {
        await _context.Skills.AddAsync(skill, ct);
        await _context.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(Skill skill, CancellationToken ct = default)
    {
        _context.Skills.Update(skill);
        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int skillId, CancellationToken ct = default)
    {
        var skill = await _context.Skills.FindAsync(new object[] { skillId }, ct);
        if (skill != null)
        {
            _context.Skills.Remove(skill);
            await _context.SaveChangesAsync(ct);
        }
    }
}
