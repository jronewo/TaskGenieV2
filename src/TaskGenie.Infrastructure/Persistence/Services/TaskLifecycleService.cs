using Microsoft.EntityFrameworkCore;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using Task = System.Threading.Tasks.Task;
using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Infrastructure.Persistence.Services;

public sealed class TaskLifecycleService(AppDbContext context) : ITaskLifecycleService
{
    public Task DeleteTaskAsync(TaskEntity task, CancellationToken ct = default)
    {
        return ExecuteInTransactionAsync(async () =>
        {
            var taskId = task.TaskId;

            // Every dependent row is deleted explicitly rather than relying on DB-level
            // ON DELETE CASCADE: some of these FKs (ai_recommendations.task_id, task_assignees,
            // task_comments, the reverse task_dependencies edge, task_embeddings) have no cascade
            // configured at all and block the delete outright; the rest are handled here too so
            // the app layer is authoritative regardless of what the current migration/DB state
            // actually enforces.
            var recommendations = await context.AiRecommendations.Where(r => r.TaskId == taskId).ToListAsync(ct);
            context.AiRecommendations.RemoveRange(recommendations);

            var assignees = await context.TaskAssignees.Where(a => a.TaskId == taskId).ToListAsync(ct);
            context.TaskAssignees.RemoveRange(assignees);

            var comments = await context.TaskComments.Where(c => c.TaskId == taskId).ToListAsync(ct);
            context.TaskComments.RemoveRange(comments);

            // Both edges of task_dependencies: this task depending on others, and other tasks
            // depending on this one.
            var dependencies = await context.TaskDependencies
                .Where(d => d.TaskId == taskId || d.DependsOnTaskId == taskId)
                .ToListAsync(ct);
            context.TaskDependencies.RemoveRange(dependencies);

            var embedding = await context.TaskEmbeddings.FirstOrDefaultAsync(e => e.TaskId == taskId, ct);
            if (embedding is not null)
                context.TaskEmbeddings.Remove(embedding);

            var requiredSkills = await context.Set<TaskRequiredSkill>()
                .Where(s => s.TaskId == taskId)
                .ToListAsync(ct);
            context.RemoveRange(requiredSkills);

            var logs = await context.TaskLogs.Where(l => l.TaskId == taskId).ToListAsync(ct);
            context.TaskLogs.RemoveRange(logs);

            var analyses = await context.AiAnalyses.Where(a => a.TaskId == taskId).ToListAsync(ct);
            context.AiAnalyses.RemoveRange(analyses);

            var riskHistories = await context.RiskScoreHistories
                .Include(h => h.Factors)
                .Where(h => h.TaskId == taskId)
                .ToListAsync(ct);
            foreach (var history in riskHistories)
                context.RiskFactors.RemoveRange(history.Factors);
            context.RiskScoreHistories.RemoveRange(riskHistories);

            var evidences = await context.TaskEvidences.Where(e => e.TaskId == taskId).ToListAsync(ct);
            var attachmentIds = evidences.Where(e => e.AttachmentId.HasValue).Select(e => e.AttachmentId!.Value).ToList();
            context.TaskEvidences.RemoveRange(evidences);
            if (attachmentIds.Count > 0)
            {
                var attachments = await context.Attachments.Where(a => attachmentIds.Contains(a.AttachmentId)).ToListAsync(ct);
                context.Attachments.RemoveRange(attachments);
            }

            // AI execution logs are task-run audit records with no independent meaning once the
            // task is gone — delete them rather than leaving them dangling or detached.
            var executionLogs = await context.AiExecutionLogs.Where(l => l.TaskId == taskId).ToListAsync(ct);
            context.AiExecutionLogs.RemoveRange(executionLogs);

            // Reward/penalty history must survive the task being deleted — only the dangling
            // reference is cleared, never the score itself.
            var scores = await context.UserScores.Where(s => s.TaskId == taskId).ToListAsync(ct);
            foreach (var score in scores)
                context.Entry(score).Property(s => s.TaskId).CurrentValue = null;

            await context.SaveChangesAsync(ct);

            context.Tasks.Remove(task);
            await context.SaveChangesAsync(ct);
        }, ct);
    }

    private async Task ExecuteInTransactionAsync(Func<Task> operation, CancellationToken ct)
    {
        if (!context.Database.IsRelational())
        {
            await operation();
            return;
        }

        var strategy = context.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await context.Database.BeginTransactionAsync(ct);
            try
            {
                await operation();
                await transaction.CommitAsync(ct);
            }
            catch
            {
                await transaction.RollbackAsync(ct);
                throw;
            }
        });
    }
}
