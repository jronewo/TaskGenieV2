using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;
using TaskEntity = TaskGenie.Domain.Entities.Task;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class TaskRepository : ITaskRepository
{
    private readonly AppDbContext _context;

    public TaskRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<TaskEntity?> GetByIdAsync(int taskId, CancellationToken ct = default)
    {
        return await _context.Tasks
            .Include(t => t.Project)
            .FirstOrDefaultAsync(t => t.TaskId == taskId, ct);
    }

    public async Task<TaskEntity?> GetByIdWithDetailsAsync(int taskId, CancellationToken ct = default)
    {
        return await _context.Tasks
            .Include(t => t.Project)
            .Include(t => t.TaskAssignees).ThenInclude(ta => ta.User)
            .Include(t => t.TaskDependencies).ThenInclude(td => td.DependsOnTask)
            .Include(t => t.TaskRequiredSkills)
            .FirstOrDefaultAsync(t => t.TaskId == taskId, ct);
    }

    public async Task<List<TaskEntity>> GetByProjectIdAsync(int projectId, CancellationToken ct = default)
    {
        return await _context.Tasks
            .Where(t => t.ProjectId == projectId)
            .ToListAsync(ct);
    }

    public async Task<List<TaskAssignee>> GetTaskAssigneesAsync(int taskId, CancellationToken ct = default)
    {
        return await _context.TaskAssignees
            .Where(ta => ta.TaskId == taskId)
            .Include(ta => ta.User)
            .ToListAsync(ct);
    }

    public async Task ClearTaskAssigneesAsync(int taskId, CancellationToken ct = default)
    {
        var assignees = await _context.TaskAssignees.Where(ta => ta.TaskId == taskId).ToListAsync(ct);
        if (assignees.Any())
        {
            _context.TaskAssignees.RemoveRange(assignees);
            await _context.SaveChangesAsync(ct);
        }
    }

    public async Task AddTaskAssigneeAsync(TaskAssignee assignee, CancellationToken ct = default)
    {
        _context.TaskAssignees.Add(assignee);
        await _context.SaveChangesAsync(ct);
    }

    public async Task UpdateProgressAsync(int taskId, int progress, string riskLevel, CancellationToken ct = default)
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.TaskId == taskId, ct);
        if (task != null)
        {
            task.UpdateProgress(status: null, progress: progress, riskLevel: riskLevel, actualTime: null);
            _context.Tasks.Update(task);
            await _context.SaveChangesAsync(ct);
        }
    }

    public async Task<int> GetCompletedTaskCountByProjectAsync(int projectId, CancellationToken ct = default)
    {
        return await _context.Tasks
            .Where(t => t.ProjectId == projectId && t.Status == "Done")
            .CountAsync(ct);
    }

    public async Task<int> GetTotalTaskCountByProjectAsync(int projectId, CancellationToken ct = default)
    {
        return await _context.Tasks
            .Where(t => t.ProjectId == projectId)
            .CountAsync(ct);
    }

    public async Task<TaskEntity> AddAsync(TaskEntity task, CancellationToken ct = default)
    {
        _context.Tasks.Add(task);
        await _context.SaveChangesAsync(ct);
        return task;
    }

    public async Task UpdateAsync(TaskEntity task, CancellationToken ct = default)
    {
        _context.Tasks.Update(task);
        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int taskId, CancellationToken ct = default)
    {
        var task = await _context.Tasks.FindAsync(new object[] { taskId }, ct);
        if (task != null)
        {
            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync(ct);
        }
    }

    public async Task<List<TaskEntity>> GetByProjectIdWithDetailsAsync(int projectId, CancellationToken ct = default)
    {
        return await _context.Tasks
            .Where(t => t.ProjectId == projectId)
            .Include(t => t.TaskAssignees)
                .ThenInclude(ta => ta.User)
            .Include(t => t.TaskDependencies)
                .ThenInclude(td => td.DependsOnTask)
            .Include(t => t.DependentOnTasks)
            .ToListAsync(ct);
    }

    public async Task<List<TaskEntity>> GetByAssigneeAsync(int userId, CancellationToken ct = default)
    {
        return await _context.Tasks
            .Include(t => t.Project)
            .Include(t => t.TaskAssignees).ThenInclude(ta => ta.User)
            .Include(t => t.TaskDependencies).ThenInclude(td => td.DependsOnTask)
            .Where(t => t.TaskAssignees.Any(ta => ta.UserId == userId))
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(ct);
    }
}
