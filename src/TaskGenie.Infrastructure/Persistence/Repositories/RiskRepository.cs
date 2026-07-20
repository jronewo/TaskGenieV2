using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public sealed class RiskRepository(AppDbContext context) : IRiskRepository
{
    public async Task<List<RiskRule>> GetActiveRulesAsync(CancellationToken ct = default) =>
        await context.RiskRules
            .Where(rule => rule.IsActive)
            .OrderBy(rule => rule.RiskRuleId)
            .ToListAsync(ct);

    public async Task AddAssessmentAsync(
        RiskScoreHistory history,
        AiExecutionLog executionLog,
        CancellationToken ct = default)
    {
        if (!context.Database.IsRelational())
        {
            context.RiskScoreHistories.Add(history);
            context.AiExecutionLogs.Add(executionLog);
            await context.SaveChangesAsync(ct);
            return;
        }

        await using var transaction = await context.Database.BeginTransactionAsync(ct);
        context.RiskScoreHistories.Add(history);
        context.AiExecutionLogs.Add(executionLog);
        await context.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }

    public async Task<List<RiskScoreHistory>> GetHistoryByTaskIdAsync(int taskId, CancellationToken ct = default) =>
        await context.RiskScoreHistories
            .Where(history => history.TaskId == taskId)
            .Include(history => history.Factors)
            .OrderByDescending(history => history.CreatedAt)
            .ToListAsync(ct);

    public async Task<RiskScoreHistory?> GetLatestByTaskIdAsync(int taskId, CancellationToken ct = default) =>
        await context.RiskScoreHistories
            .Where(history => history.TaskId == taskId)
            .Include(history => history.Factors)
            .OrderByDescending(history => history.CreatedAt)
            .FirstOrDefaultAsync(ct);

    public async Task AddExecutionLogAsync(AiExecutionLog executionLog, CancellationToken ct = default)
    {
        context.AiExecutionLogs.Add(executionLog);
        await context.SaveChangesAsync(ct);
    }

    public async Task<List<AiExecutionLog>> GetExecutionLogsByTaskIdAsync(int taskId, CancellationToken ct = default) =>
        await context.AiExecutionLogs
            .Where(log => log.TaskId == taskId)
            .OrderByDescending(log => log.CreatedAt)
            .ToListAsync(ct);
}
