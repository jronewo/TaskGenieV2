using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface IAiRecommendationRepository
{
    System.Threading.Tasks.Task AddAsync(AiRecommendation recommendation, CancellationToken ct = default);
    System.Threading.Tasks.Task AddRangeAsync(List<AiRecommendation> recommendations, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<AiRecommendation>> GetByTaskIdAsync(int taskId, CancellationToken ct = default);
    System.Threading.Tasks.Task DeleteByTaskIdAsync(int taskId, CancellationToken ct = default);
}
