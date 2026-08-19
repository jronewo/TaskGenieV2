using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface ITaskRequiredSkillRepository
{
    System.Threading.Tasks.Task<List<TaskRequiredSkill>> GetByTaskIdAsync(int taskId, CancellationToken ct = default);
    /// <summary>Replaces a task's requirements. The level matters: the assignment score divides the
    /// candidate's level by it, so storing everything at 1 collapses the match into has/has-not.</summary>
    System.Threading.Tasks.Task ReplaceTaskSkillsAsync(
        int taskId,
        IReadOnlyList<(int SkillId, int RequiredLevel)> skills,
        CancellationToken ct = default);
}
