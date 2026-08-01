using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Application.Interfaces;

/// <summary>
/// Owns atomic Task deletion. Some dependent tables (AI recommendations, task assignees, task
/// comments, both edges of task dependencies, task embeddings) have no DB-level cascade
/// configured at all, so deleting a task directly used to fail with an FK violation once any of
/// that dependent data existed. Rather than rely on the DB/migration state for the rest, this
/// service explicitly deletes every dependent row (AI recommendations/analyses/execution logs,
/// risk history + factors, task logs, evidence + attachments, required skills, assignees,
/// comments, both dependency edges, the embedding) in one transaction before removing the task
/// itself. The one exception is historical UserScore (reward/penalty) rows: those are never
/// deleted, only their TaskId reference is cleared, so a user's earned score history survives.
/// </summary>
public interface ITaskLifecycleService
{
    System.Threading.Tasks.Task DeleteTaskAsync(TaskEntity task, CancellationToken ct = default);
}
