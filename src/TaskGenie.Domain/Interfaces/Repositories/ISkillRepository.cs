using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface ISkillRepository
{
    System.Threading.Tasks.Task<Skill?> GetByIdAsync(int skillId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<Skill>> GetAllAsync(CancellationToken ct = default);
    System.Threading.Tasks.Task<Skill?> GetByNameAsync(string skillName, CancellationToken ct = default);
    System.Threading.Tasks.Task AddAsync(Skill skill, CancellationToken ct = default);
    System.Threading.Tasks.Task UpdateAsync(Skill skill, CancellationToken ct = default);
    System.Threading.Tasks.Task DeleteAsync(int skillId, CancellationToken ct = default);
}
