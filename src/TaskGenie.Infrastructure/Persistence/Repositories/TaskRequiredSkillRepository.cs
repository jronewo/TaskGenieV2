using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class TaskRequiredSkillRepository : ITaskRequiredSkillRepository
{
    private readonly AppDbContext _context;

    public TaskRequiredSkillRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<TaskRequiredSkill>> GetByTaskIdAsync(int taskId, CancellationToken ct = default)
    {
        return await _context.TaskRequiredSkills
            .Where(trs => trs.TaskId == taskId)
            .Include(trs => trs.Skill)
            .ToListAsync(ct);
    }

    public async Task ReplaceTaskSkillsAsync(
        int taskId,
        IReadOnlyList<(int SkillId, int RequiredLevel)> skills,
        CancellationToken ct = default)
    {
        var existing = await _context.TaskRequiredSkills.Where(trs => trs.TaskId == taskId).ToListAsync(ct);
        _context.TaskRequiredSkills.RemoveRange(existing);

        var newSkills = skills.Select(skill => TaskRequiredSkill.Create(taskId, skill.SkillId, skill.RequiredLevel));

        await _context.TaskRequiredSkills.AddRangeAsync(newSkills, ct);
        await _context.SaveChangesAsync(ct);
    }
}
