using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface ITaskDependencyRepository
{
    System.Threading.Tasks.Task<TaskDependency?> GetByIdAsync(int dependencyId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<TaskDependency>> GetByTaskIdAsync(int taskId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<TaskDependency>> GetByTaskIdWithDetailsAsync(int taskId, CancellationToken ct = default);
    /// <summary>Every dependency in a project in one query — the graph needs the whole set, and
    /// asking per task turned one screen into N round trips.</summary>
    System.Threading.Tasks.Task<List<TaskDependency>> GetByProjectIdAsync(int projectId, CancellationToken ct = default);

    System.Threading.Tasks.Task AddAsync(TaskDependency dependency, CancellationToken ct = default);
    System.Threading.Tasks.Task DeleteAsync(int dependencyId, CancellationToken ct = default);
}
