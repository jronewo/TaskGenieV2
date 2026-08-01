using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface IOrganizationMemberRepository
{
    System.Threading.Tasks.Task<OrganizationMember?> GetByIdAsync(int organizationMemberId, CancellationToken ct = default);
    System.Threading.Tasks.Task<OrganizationMember?> GetMembershipAsync(int organizationId, int userId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<OrganizationMember>> GetByOrganizationIdAsync(int organizationId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<OrganizationMember>> GetByUserIdAsync(int userId, CancellationToken ct = default);
    System.Threading.Tasks.Task AddAsync(OrganizationMember member, CancellationToken ct = default);
    System.Threading.Tasks.Task UpdateAsync(OrganizationMember member, CancellationToken ct = default);
    System.Threading.Tasks.Task DeleteAsync(int organizationMemberId, CancellationToken ct = default);
}
