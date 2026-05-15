using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface IUserSkillRepository
{
    System.Threading.Tasks.Task<UserSkill?> GetByIdAsync(int id, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<UserSkill>> GetByUserIdAsync(int userId, CancellationToken ct = default);
    System.Threading.Tasks.Task AddAsync(UserSkill userSkill, CancellationToken ct = default);
    System.Threading.Tasks.Task UpdateAsync(UserSkill userSkill, CancellationToken ct = default);
    System.Threading.Tasks.Task DeleteAsync(int id, CancellationToken ct = default);
}
