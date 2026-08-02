using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface IOrganizationMemberRepository
{
    System.Threading.Tasks.Task<OrganizationMember?> GetByIdAsync(int organizationMemberId, CancellationToken ct = default);

    /// <summary>Any row for the pair, including a REMOVED one (so a removed member can be reinstated
    /// instead of inserting a duplicate).</summary>
    System.Threading.Tasks.Task<OrganizationMember?> GetByOrganizationAndUserAsync(int organizationId, int userId, CancellationToken ct = default);

    /// <summary>ACTIVE members only, ordered by role then join date.</summary>
    System.Threading.Tasks.Task<List<OrganizationMember>> GetActiveByOrganizationAsync(int organizationId, CancellationToken ct = default);

    /// <summary>Every ACTIVE membership the user holds, across organizations.</summary>
    System.Threading.Tasks.Task<List<OrganizationMember>> GetActiveByUserAsync(int userId, CancellationToken ct = default);

    System.Threading.Tasks.Task<int> CountActiveOwnersAsync(int organizationId, CancellationToken ct = default);

    System.Threading.Tasks.Task AddAsync(OrganizationMember member, CancellationToken ct = default);
    System.Threading.Tasks.Task UpdateAsync(OrganizationMember member, CancellationToken ct = default);
}
