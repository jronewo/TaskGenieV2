using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface ITaskCommentRepository
{
    System.Threading.Tasks.Task<TaskComment?> GetByIdAsync(int commentId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<TaskComment>> GetByTaskIdAsync(int taskId, CancellationToken ct = default);
    System.Threading.Tasks.Task AddAsync(TaskComment comment, CancellationToken ct = default);
    System.Threading.Tasks.Task UpdateAsync(TaskComment comment, CancellationToken ct = default);
    System.Threading.Tasks.Task DeleteAsync(int commentId, CancellationToken ct = default);
}
