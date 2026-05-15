using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface ITaskRequiredSkillRepository
{
    System.Threading.Tasks.Task<List<TaskRequiredSkill>> GetByTaskIdAsync(int taskId, CancellationToken ct = default);
    System.Threading.Tasks.Task ReplaceTaskSkillsAsync(int taskId, List<int> skillIds, CancellationToken ct = default);
}
