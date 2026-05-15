using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class TaskLogRepository : ITaskLogRepository
{
    private readonly AppDbContext _context;

    public TaskLogRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(TaskLog log, CancellationToken ct = default)
    {
        _context.TaskLogs.Add(log);
        await _context.SaveChangesAsync(ct);
    }

    public async Task<List<TaskLog>> GetByTaskIdAsync(int taskId, CancellationToken ct = default)
    {
        return await _context.TaskLogs
            .Where(tl => tl.TaskId == taskId)
            .OrderByDescending(tl => tl.CreatedAt)
            .ToListAsync(ct);
    }
}
