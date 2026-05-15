using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface ITeamMemberRepository
{
    System.Threading.Tasks.Task<TeamMember?> GetByIdAsync(int id, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<TeamMember>> GetByTeamIdAsync(int teamId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<TeamMember>> GetByUserIdAsync(int userId, CancellationToken ct = default);
    System.Threading.Tasks.Task AddAsync(TeamMember teamMember, CancellationToken ct = default);
    System.Threading.Tasks.Task UpdateAsync(TeamMember teamMember, CancellationToken ct = default);
    System.Threading.Tasks.Task DeleteAsync(int id, CancellationToken ct = default);
}
