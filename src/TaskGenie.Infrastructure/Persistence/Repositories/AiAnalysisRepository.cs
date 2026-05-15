using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class AiAnalysisRepository : IAiAnalysisRepository
{
    private readonly AppDbContext _context;

    public AiAnalysisRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(AiAnalysis analysis, CancellationToken ct = default)
    {
        _context.AiAnalyses.Add(analysis);
        await _context.SaveChangesAsync(ct);
    }

    public async Task<List<AiAnalysis>> GetByTaskIdAsync(int taskId, CancellationToken ct = default)
    {
        return await _context.AiAnalyses
            .Where(a => a.TaskId == taskId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<AiAnalysis?> GetByTypeAsync(int taskId, string analysisType, CancellationToken ct = default)
    {
        return await _context.AiAnalyses
            .Where(a => a.TaskId == taskId && a.AnalysisType == analysisType)
            .OrderByDescending(a => a.CreatedAt)
            .FirstOrDefaultAsync(ct);
    }
}
