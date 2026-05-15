using TaskGenie.Domain.Entities;
using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface ITaskRepository
{
    System.Threading.Tasks.Task<TaskEntity?> GetByIdAsync(int taskId, CancellationToken ct = default);
    System.Threading.Tasks.Task<TaskEntity?> GetByIdWithDetailsAsync(int taskId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<TaskEntity>> GetByProjectIdAsync(int projectId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<TaskEntity>> GetByProjectIdWithDetailsAsync(int projectId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<TaskEntity>> GetByAssigneeAsync(int userId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<TaskAssignee>> GetTaskAssigneesAsync(int taskId, CancellationToken ct = default);
    System.Threading.Tasks.Task ClearTaskAssigneesAsync(int taskId, CancellationToken ct = default);
    System.Threading.Tasks.Task AddTaskAssigneeAsync(TaskAssignee assignee, CancellationToken ct = default);
    System.Threading.Tasks.Task UpdateProgressAsync(int taskId, int progress, string riskLevel, CancellationToken ct = default);
    System.Threading.Tasks.Task<int> GetCompletedTaskCountByProjectAsync(int projectId, CancellationToken ct = default);
    System.Threading.Tasks.Task<int> GetTotalTaskCountByProjectAsync(int projectId, CancellationToken ct = default);
    System.Threading.Tasks.Task<TaskEntity> AddAsync(TaskEntity task, CancellationToken ct = default);
    System.Threading.Tasks.Task UpdateAsync(TaskEntity task, CancellationToken ct = default);
    System.Threading.Tasks.Task DeleteAsync(int taskId, CancellationToken ct = default);
}
