using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface IRiskRepository
{
    System.Threading.Tasks.Task<List<RiskRule>> GetActiveRulesAsync(CancellationToken ct = default);
    System.Threading.Tasks.Task AddAssessmentAsync(
        RiskScoreHistory history,
        AiExecutionLog executionLog,
        CancellationToken ct = default);
    System.Threading.Tasks.Task<List<RiskScoreHistory>> GetHistoryByTaskIdAsync(int taskId, CancellationToken ct = default);
    System.Threading.Tasks.Task<RiskScoreHistory?> GetLatestByTaskIdAsync(int taskId, CancellationToken ct = default);
    System.Threading.Tasks.Task AddExecutionLogAsync(AiExecutionLog executionLog, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<AiExecutionLog>> GetExecutionLogsByTaskIdAsync(int taskId, CancellationToken ct = default);
}
