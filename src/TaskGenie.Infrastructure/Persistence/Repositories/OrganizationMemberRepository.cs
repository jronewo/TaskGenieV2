using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class OrganizationMemberRepository(AppDbContext context) : IOrganizationMemberRepository
{
    public async System.Threading.Tasks.Task<OrganizationMember?> GetByIdAsync(int organizationMemberId, CancellationToken ct = default)
        => await context.OrganizationMembers
            .Include(m => m.User)
            .SingleOrDefaultAsync(m => m.OrganizationMemberId == organizationMemberId, ct);

    public async System.Threading.Tasks.Task<OrganizationMember?> GetByOrganizationAndUserAsync(int organizationId, int userId, CancellationToken ct = default)
        => await context.OrganizationMembers
            .Include(m => m.User)
            .SingleOrDefaultAsync(m => m.OrganizationId == organizationId && m.UserId == userId, ct);

    public async System.Threading.Tasks.Task<List<OrganizationMember>> GetActiveByOrganizationAsync(int organizationId, CancellationToken ct = default)
        => await context.OrganizationMembers
            .Include(m => m.User)
            .Where(m => m.OrganizationId == organizationId && m.Status == OrganizationMemberStatuses.Active)
            .OrderBy(m => m.Role == OrganizationRoles.Owner ? 0 : m.Role == OrganizationRoles.OrgAdmin ? 1 : 2)
            .ThenBy(m => m.JoinedAt)
            .ToListAsync(ct);

    public async System.Threading.Tasks.Task<List<OrganizationMember>> GetActiveByUserAsync(int userId, CancellationToken ct = default)
        => await context.OrganizationMembers
            .Include(m => m.Organization)
            .Where(m => m.UserId == userId && m.Status == OrganizationMemberStatuses.Active)
            .OrderBy(m => m.JoinedAt)
            .ToListAsync(ct);

    public async System.Threading.Tasks.Task<int> CountActiveOwnersAsync(int organizationId, CancellationToken ct = default)
        => await context.OrganizationMembers.CountAsync(
            m => m.OrganizationId == organizationId
                 && m.Status == OrganizationMemberStatuses.Active
                 && m.Role == OrganizationRoles.Owner, ct);

    public async System.Threading.Tasks.Task AddAsync(OrganizationMember member, CancellationToken ct = default)
    {
        await context.OrganizationMembers.AddAsync(member, ct);
        await context.SaveChangesAsync(ct);
    }

    public async System.Threading.Tasks.Task UpdateAsync(OrganizationMember member, CancellationToken ct = default)
    {
        context.OrganizationMembers.Update(member);
        await context.SaveChangesAsync(ct);
    }
}
