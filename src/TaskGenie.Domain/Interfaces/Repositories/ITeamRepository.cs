using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface ITeamRepository
{
    System.Threading.Tasks.Task<Team?> GetByIdAsync(int teamId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<Team>> GetAllAsync(CancellationToken ct = default);
    System.Threading.Tasks.Task<List<Team>> GetTeamsByCreatorIdAsync(int userId, CancellationToken ct = default);
    System.Threading.Tasks.Task AddAsync(Team team, CancellationToken ct = default);
    System.Threading.Tasks.Task UpdateAsync(Team team, CancellationToken ct = default);
    System.Threading.Tasks.Task DeleteAsync(int teamId, CancellationToken ct = default);
}
