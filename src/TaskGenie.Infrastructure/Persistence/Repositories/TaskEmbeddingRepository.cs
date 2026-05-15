using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class TaskEmbeddingRepository : ITaskEmbeddingRepository
{
    private readonly AppDbContext _context;

    public TaskEmbeddingRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task UpsertAsync(TaskEmbedding embedding, CancellationToken ct = default)
    {
        var existing = await _context.TaskEmbeddings.FirstOrDefaultAsync(e => e.TaskId == embedding.TaskId, ct);
        if (existing == null)
        {
            _context.TaskEmbeddings.Add(embedding);
        }
        else
        {
            existing.UpdateEmbedding(embedding.Embedding);
            _context.TaskEmbeddings.Update(existing);
        }
        await _context.SaveChangesAsync(ct);
    }

    public async Task<TaskEmbedding?> GetByTaskIdAsync(int taskId, CancellationToken ct = default)
    {
        return await _context.TaskEmbeddings.FirstOrDefaultAsync(e => e.TaskId == taskId, ct);
    }
}
