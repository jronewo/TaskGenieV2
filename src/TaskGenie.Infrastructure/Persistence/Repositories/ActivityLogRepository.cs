using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class ActivityLogRepository : IActivityLogRepository
{
    private readonly AppDbContext _context;

    public ActivityLogRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ActivityLog?> GetByIdAsync(int logId, CancellationToken ct = default)
    {
        return await _context.ActivityLogs
            .FirstOrDefaultAsync(l => l.LogId == logId, ct);
    }

    public async Task<List<ActivityLog>> GetByUserIdAsync(int userId, CancellationToken ct = default)
    {
        return await _context.ActivityLogs
            .Where(l => l.UserId == userId)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<List<ActivityLog>> GetByEntityAsync(string entityType, int entityId, CancellationToken ct = default)
    {
        return await _context.ActivityLogs
            .Where(l => l.EntityType == entityType && l.EntityId == entityId)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<List<ActivityLog>> GetAllAsync(int limit = 50, CancellationToken ct = default)
    {
        return await _context.ActivityLogs
            .OrderByDescending(l => l.CreatedAt)
            .Take(limit)
            .ToListAsync(ct);
    }

    public async Task<List<ActivityLog>> GetByProjectAsync(int projectId, int limit = 50, CancellationToken ct = default)
    {
        var taskIds = await _context.Tasks
            .Where(t => t.ProjectId == projectId)
            .Select(t => t.TaskId)
            .ToListAsync(ct);

        return await _context.ActivityLogs
            .Where(l =>
                (l.EntityType == "Project" && l.EntityId == projectId) ||
                (l.EntityType == "Task" && taskIds.Contains(l.EntityId ?? 0))
            )
            .OrderByDescending(l => l.CreatedAt)
            .Take(limit)
            .ToListAsync(ct);
    }

    public async Task AddAsync(ActivityLog log, CancellationToken ct = default)
    {
        await _context.ActivityLogs.AddAsync(log, ct);
        await _context.SaveChangesAsync(ct);
    }
}
