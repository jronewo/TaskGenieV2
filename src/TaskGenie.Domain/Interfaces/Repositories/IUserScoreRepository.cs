using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface IUserScoreRepository
{
    System.Threading.Tasks.Task<UserScore> AddAsync(UserScore userScore, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<UserScore>> GetByUserIdAsync(int userId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<UserScore>> GetByProjectIdAsync(int projectId, CancellationToken ct = default);
    System.Threading.Tasks.Task<int> GetTotalScoreByUserAsync(int userId, CancellationToken ct = default);
}