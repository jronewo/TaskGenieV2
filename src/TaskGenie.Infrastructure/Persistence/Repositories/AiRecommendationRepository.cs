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

    public async Task<List<AiRecommendation>> GetLatestRunByTaskIdAsync(int taskId, CancellationToken ct = default)
    {
        var latestRunId = await _context.AiRecommendations
            .Where(recommendation => recommendation.TaskId == taskId)
            .OrderByDescending(recommendation => recommendation.CreatedAt)
            .Select(recommendation => (Guid?)recommendation.RunId)
            .FirstOrDefaultAsync(ct);

        if (!latestRunId.HasValue) return new List<AiRecommendation>();

        return await _context.AiRecommendations
            .Where(recommendation => recommendation.TaskId == taskId && recommendation.RunId == latestRunId.Value)
            .Include(recommendation => recommendation.SuggestedUser)
            .OrderBy(recommendation => recommendation.Rank)
            .ToListAsync(ct);
    }

    public async Task RecordDecisionAsync(
        int taskId,
        int userId,
        bool accepted,
        int? decidedBy,
        string? outcome,
        CancellationToken ct = default)
    {
        var latest = await GetLatestRunByTaskIdAsync(taskId, ct);
        if (latest.Count == 0)
            throw new InvalidOperationException("No generated recommendation exists for this task.");

        var selected = latest.FirstOrDefault(recommendation => recommendation.SuggestedUserId == userId)
            ?? throw new InvalidOperationException("The selected user is not part of the latest recommendation run.");

        if (accepted)
        {
            foreach (var recommendation in latest)
                recommendation.RecordDecision(recommendation.Id == selected.Id, decidedBy, recommendation.Id == selected.Id ? outcome : null);
        }
        else
        {
            selected.RecordDecision(false, decidedBy, outcome);
        }

        await _context.SaveChangesAsync(ct);
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
