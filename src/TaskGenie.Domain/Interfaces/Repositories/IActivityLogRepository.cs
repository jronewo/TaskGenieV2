using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface IActivityLogRepository
{
    System.Threading.Tasks.Task<ActivityLog?> GetByIdAsync(int logId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<ActivityLog>> GetByUserIdAsync(int userId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<ActivityLog>> GetByEntityAsync(string entityType, int entityId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<ActivityLog>> GetByProjectAsync(int projectId, int limit = 50, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<ActivityLog>> GetAllAsync(int limit = 50, CancellationToken ct = default);
    System.Threading.Tasks.Task AddAsync(ActivityLog log, CancellationToken ct = default);
}
