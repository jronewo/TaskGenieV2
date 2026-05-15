using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface IProjectEvaluationRepository
{
    System.Threading.Tasks.Task<ProjectEvaluation?> GetByProjectIdAsync(int projectId, CancellationToken ct = default);
    System.Threading.Tasks.Task<ProjectEvaluation?> GetByIdAsync(int evaluationId, CancellationToken ct = default);
    System.Threading.Tasks.Task<bool> ExistsByProjectIdAsync(int projectId, CancellationToken ct = default);
    System.Threading.Tasks.Task AddAsync(ProjectEvaluation evaluation, CancellationToken ct = default);
    System.Threading.Tasks.Task UpdateAsync(ProjectEvaluation evaluation, CancellationToken ct = default);
}
