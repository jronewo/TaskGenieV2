using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class EvaluationRepository : IEvaluationRepository
{
    private readonly AppDbContext _context;

    public EvaluationRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Evaluation?> GetByIdAsync(int evaluationId, CancellationToken ct = default)
    {
        return await _context.Evaluations
            .Include(e => e.User)
            .Include(e => e.Leader)
            .FirstOrDefaultAsync(e => e.EvaluationId == evaluationId, ct);
    }

    public async Task<List<Evaluation>> GetByUserIdAsync(int userId, CancellationToken ct = default)
    {
        return await _context.Evaluations
            .Where(e => e.UserId == userId)
            .Include(e => e.Leader)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<List<Evaluation>> GetByLeaderIdAsync(int leaderId, CancellationToken ct = default)
    {
        return await _context.Evaluations
            .Where(e => e.LeaderId == leaderId)
            .Include(e => e.User)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task AddAsync(Evaluation evaluation, CancellationToken ct = default)
    {
        await _context.Evaluations.AddAsync(evaluation, ct);
        await _context.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(Evaluation evaluation, CancellationToken ct = default)
    {
        _context.Evaluations.Update(evaluation);
        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int evaluationId, CancellationToken ct = default)
    {
        var evaluation = await _context.Evaluations.FindAsync(new object[] { evaluationId }, ct);
        if (evaluation != null)
        {
            _context.Evaluations.Remove(evaluation);
            await _context.SaveChangesAsync(ct);
        }
    }
}
