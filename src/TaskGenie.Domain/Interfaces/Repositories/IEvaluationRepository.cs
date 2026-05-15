using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface IEvaluationRepository
{
    System.Threading.Tasks.Task<Evaluation?> GetByIdAsync(int evaluationId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<Evaluation>> GetByUserIdAsync(int userId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<Evaluation>> GetByLeaderIdAsync(int leaderId, CancellationToken ct = default);
    System.Threading.Tasks.Task AddAsync(Evaluation evaluation, CancellationToken ct = default);
    System.Threading.Tasks.Task UpdateAsync(Evaluation evaluation, CancellationToken ct = default);
    System.Threading.Tasks.Task DeleteAsync(int evaluationId, CancellationToken ct = default);
}
