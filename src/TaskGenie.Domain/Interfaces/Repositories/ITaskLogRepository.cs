using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface ITaskLogRepository
{
    System.Threading.Tasks.Task AddAsync(TaskLog log, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<TaskLog>> GetByTaskIdAsync(int taskId, CancellationToken ct = default);
}
