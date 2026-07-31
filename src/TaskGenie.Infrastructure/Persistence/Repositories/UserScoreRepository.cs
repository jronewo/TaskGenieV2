using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class UserScoreRepository : IUserScoreRepository
{
    private readonly AppDbContext _context;

    public UserScoreRepository(AppDbContext context) => _context = context;

    public async System.Threading.Tasks.Task<UserScore> AddAsync(UserScore userScore, CancellationToken ct = default)
    {
        await _context.UserScores.AddAsync(userScore, ct);
        await _context.SaveChangesAsync(ct);
        return userScore;
    }

    public async System.Threading.Tasks.Task<List<UserScore>> GetByUserIdAsync(int userId, CancellationToken ct = default)
        => await _context.UserScores
            .Include(us => us.User)
            .Include(us => us.Task)
            .Include(us => us.Project)
            .Where(us => us.UserId == userId)
            .OrderByDescending(us => us.CreatedAt)
            .ToListAsync(ct);

    public async System.Threading.Tasks.Task<List<UserScore>> GetByProjectIdAsync(int projectId, CancellationToken ct = default)
        => await _context.UserScores
            .Include(us => us.User)
            .Include(us => us.Task)
            .Include(us => us.Project)
            .Where(us => us.ProjectId == projectId)
            .OrderByDescending(us => us.CreatedAt)
            .ToListAsync(ct);

    public async System.Threading.Tasks.Task<int> GetTotalScoreByUserAsync(int userId, CancellationToken ct = default)
        => await _context.UserScores
            .Where(us => us.UserId == userId)
            .SumAsync(us => us.Amount, ct);
}