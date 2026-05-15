using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface IAiAnalysisRepository
{
    System.Threading.Tasks.Task AddAsync(AiAnalysis analysis, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<AiAnalysis>> GetByTaskIdAsync(int taskId, CancellationToken ct = default);
    System.Threading.Tasks.Task<AiAnalysis?> GetByTypeAsync(int taskId, string analysisType, CancellationToken ct = default);
}
