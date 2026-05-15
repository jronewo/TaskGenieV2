using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class AiRecommendationRepository : IAiRecommendationRepository
{
    private readonly AppDbContext _context;

    public AiRecommendationRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(AiRecommendation recommendation, CancellationToken ct = default)
    {
        _context.AiRecommendations.Add(recommendation);
        await _context.SaveChangesAsync(ct);
    }

    public async Task AddRangeAsync(List<AiRecommendation> recommendations, CancellationToken ct = default)
    {
        _context.AiRecommendations.AddRange(recommendations);
        await _context.SaveChangesAsync(ct);
    }

    public async Task<List<AiRecommendation>> GetByTaskIdAsync(int taskId, CancellationToken ct = default)
    {
        return await _context.AiRecommendations
            .Where(ar => ar.TaskId == taskId)
            .Include(ar => ar.SuggestedUser)
            .OrderByDescending(ar => ar.Score)
            .ToListAsync(ct);
    }

    public async Task DeleteByTaskIdAsync(int taskId, CancellationToken ct = default)
    {
        var existing = await _context.AiRecommendations
            .Where(ar => ar.TaskId == taskId)
            .ToListAsync(ct);

        if (existing.Count > 0)
        {
            _context.AiRecommendations.RemoveRange(existing);
            await _context.SaveChangesAsync(ct);
        }
    }
}
