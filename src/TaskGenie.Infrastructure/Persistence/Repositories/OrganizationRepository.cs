using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class OrganizationRepository : IOrganizationRepository
{
    private readonly AppDbContext _context;

    public OrganizationRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Organization?> GetByIdAsync(int organizationId, CancellationToken ct = default)
    {
        return await _context.Organizations
            .Include(o => o.Owner)
            .FirstOrDefaultAsync(o => o.OrganizationId == organizationId, ct);
    }

    public async Task<Organization?> GetByOwnerIdAsync(int ownerId, CancellationToken ct = default)
    {
        return await _context.Organizations
            .Include(o => o.Owner)
            .FirstOrDefaultAsync(o => o.OwnerId == ownerId, ct);
    }

    public async Task<List<Organization>> GetAllAsync(CancellationToken ct = default)
    {
        return await _context.Organizations
            .Include(o => o.Owner)
            .ToListAsync(ct);
    }

    public async Task<List<Project>> GetProjectsByOrganizationIdAsync(int organizationId, CancellationToken ct = default)
    {
        // AsSplitQuery: Team.TeamMembers, Tasks, and ProjectEvaluations are sibling
        // collections — a single query joining all of them multiplies rows together
        // (cartesian product), which gets slow/expensive fast as any one of them grows.
        return await _context.Projects
            .AsSplitQuery()
            .Include(p => p.Team)
                .ThenInclude(t => t.TeamMembers)
                    .ThenInclude(tm => tm.User)
            .Include(p => p.Tasks)
            .Include(p => p.ProjectEvaluations)
            .Where(p => p.OrganizationId == organizationId)
            .ToListAsync(ct);
    }

    public async Task AddAsync(Organization organization, CancellationToken ct = default)
    {
        await _context.Organizations.AddAsync(organization, ct);
        await _context.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(Organization organization, CancellationToken ct = default)
    {
        _context.Organizations.Update(organization);
        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int organizationId, CancellationToken ct = default)
    {
        var org = await GetByIdAsync(organizationId, ct);
        if (org != null)
        {
            _context.Organizations.Remove(org);
            await _context.SaveChangesAsync(ct);
        }
    }
}
