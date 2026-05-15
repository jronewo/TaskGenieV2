using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface IProjectRepository
{
    System.Threading.Tasks.Task<Project?> GetByIdAsync(int projectId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<Project>> GetAllAsync(CancellationToken ct = default);
    System.Threading.Tasks.Task<List<Project>> GetProjectsByUserIdAsync(int userId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<Project>> GetProjectsByOrgIdAsync(int orgId, CancellationToken ct = default);
    System.Threading.Tasks.Task AddAsync(Project project, CancellationToken ct = default);
    System.Threading.Tasks.Task UpdateAsync(Project project, CancellationToken ct = default);
    System.Threading.Tasks.Task DeleteAsync(int projectId, CancellationToken ct = default);
}
