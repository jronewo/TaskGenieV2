using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class TaskCommentRepository : ITaskCommentRepository
{
    private readonly AppDbContext _context;

    public TaskCommentRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<TaskComment?> GetByIdAsync(int commentId, CancellationToken ct = default)
    {
        return await _context.TaskComments
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.CommentId == commentId, ct);
    }

    public async Task<List<TaskComment>> GetByTaskIdAsync(int taskId, CancellationToken ct = default)
    {
        return await _context.TaskComments
            .Where(c => c.TaskId == taskId)
            .Include(c => c.User)
            .OrderByDescending(c => c.CommentId)
            .ToListAsync(ct);
    }

    public async Task AddAsync(TaskComment comment, CancellationToken ct = default)
    {
        await _context.TaskComments.AddAsync(comment, ct);
        await _context.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(TaskComment comment, CancellationToken ct = default)
    {
        _context.TaskComments.Update(comment);
        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int commentId, CancellationToken ct = default)
    {
        var comment = await _context.TaskComments.FindAsync(new object[] { commentId }, ct);
        if (comment != null)
        {
            _context.TaskComments.Remove(comment);
            await _context.SaveChangesAsync(ct);
        }
    }
}
