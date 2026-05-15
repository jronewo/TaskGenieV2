using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface ITaskEmbeddingRepository
{
    System.Threading.Tasks.Task UpsertAsync(TaskEmbedding embedding, CancellationToken ct = default);
    System.Threading.Tasks.Task<TaskEmbedding?> GetByTaskIdAsync(int taskId, CancellationToken ct = default);
}
