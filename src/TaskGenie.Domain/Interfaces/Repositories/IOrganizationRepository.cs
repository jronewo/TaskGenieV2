using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface IOrganizationRepository
{
    System.Threading.Tasks.Task<Organization?> GetByIdAsync(int organizationId, CancellationToken ct = default);
    System.Threading.Tasks.Task<Organization?> GetByOwnerIdAsync(int ownerId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<Organization>> GetAllAsync(CancellationToken ct = default);
    System.Threading.Tasks.Task<List<Project>> GetProjectsByOrganizationIdAsync(int organizationId, CancellationToken ct = default);
    System.Threading.Tasks.Task AddAsync(Organization organization, CancellationToken ct = default);
    System.Threading.Tasks.Task UpdateAsync(Organization organization, CancellationToken ct = default);
    System.Threading.Tasks.Task DeleteAsync(int organizationId, CancellationToken ct = default);
}
