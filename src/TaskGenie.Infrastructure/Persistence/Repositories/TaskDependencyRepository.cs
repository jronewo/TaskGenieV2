using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class TaskDependencyRepository : ITaskDependencyRepository
{
    private readonly AppDbContext _context;

    public TaskDependencyRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<TaskDependency?> GetByIdAsync(int dependencyId, CancellationToken ct = default)
    {
        return await _context.TaskDependencies
            .FirstOrDefaultAsync(d => d.DependencyId == dependencyId, ct);
    }

    public async Task<List<TaskDependency>> GetByTaskIdAsync(int taskId, CancellationToken ct = default)
    {
        return await _context.TaskDependencies
            .Where(d => d.TaskId == taskId)
            .ToListAsync(ct);
    }

    public async Task<List<TaskDependency>> GetByTaskIdWithDetailsAsync(int taskId, CancellationToken ct = default)
    {
        return await _context.TaskDependencies
            .Include(d => d.DependsOnTask)
            .Where(d => d.TaskId == taskId)
            .ToListAsync(ct);
    }

    public async Task AddAsync(TaskDependency dependency, CancellationToken ct = default)
    {
        _context.TaskDependencies.Add(dependency);
        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int dependencyId, CancellationToken ct = default)
    {
        var dep = await _context.TaskDependencies.FindAsync(new object[] { dependencyId }, ct);
        if (dep is not null)
        {
            _context.TaskDependencies.Remove(dep);
            await _context.SaveChangesAsync(ct);
        }
    }
}
