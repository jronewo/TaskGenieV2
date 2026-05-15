using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface IInvitationRepository
{
    System.Threading.Tasks.Task<Invitation?> GetByIdAsync(int invitationId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<Invitation>> GetByTeamIdAsync(int teamId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<Invitation>> GetByEmailAsync(string email, CancellationToken ct = default);
    System.Threading.Tasks.Task AddAsync(Invitation invitation, CancellationToken ct = default);
    System.Threading.Tasks.Task UpdateAsync(Invitation invitation, CancellationToken ct = default);
    System.Threading.Tasks.Task DeleteAsync(int invitationId, CancellationToken ct = default);
}
