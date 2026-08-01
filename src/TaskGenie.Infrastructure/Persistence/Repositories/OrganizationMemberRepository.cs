using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class OrganizationMemberRepository : IOrganizationMemberRepository
{
    private readonly AppDbContext _context;

    public OrganizationMemberRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<OrganizationMember?> GetByIdAsync(int organizationMemberId, CancellationToken ct = default)
    {
        return await _context.OrganizationMembers
            .Include(m => m.User)
            .Include(m => m.Organization)
            .FirstOrDefaultAsync(m => m.OrganizationMemberId == organizationMemberId, ct);
    }

    public async Task<OrganizationMember?> GetMembershipAsync(int organizationId, int userId, CancellationToken ct = default)
    {
        return await _context.OrganizationMembers
            .Include(m => m.User)
            .FirstOrDefaultAsync(m => m.OrganizationId == organizationId && m.UserId == userId, ct);
    }

    public async Task<List<OrganizationMember>> GetByOrganizationIdAsync(int organizationId, CancellationToken ct = default)
    {
        return await _context.OrganizationMembers
            .Where(m => m.OrganizationId == organizationId)
            .Include(m => m.User)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<List<OrganizationMember>> GetByUserIdAsync(int userId, CancellationToken ct = default)
    {
        return await _context.OrganizationMembers
            .Where(m => m.UserId == userId)
            .Include(m => m.Organization)
            .ToListAsync(ct);
    }

    public async Task AddAsync(OrganizationMember member, CancellationToken ct = default)
    {
        await _context.OrganizationMembers.AddAsync(member, ct);
        await _context.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(OrganizationMember member, CancellationToken ct = default)
    {
        _context.OrganizationMembers.Update(member);
        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int organizationMemberId, CancellationToken ct = default)
    {
        var member = await _context.OrganizationMembers.FindAsync(new object[] { organizationMemberId }, ct);
        if (member != null)
        {
            _context.OrganizationMembers.Remove(member);
            await _context.SaveChangesAsync(ct);
        }
    }
}
