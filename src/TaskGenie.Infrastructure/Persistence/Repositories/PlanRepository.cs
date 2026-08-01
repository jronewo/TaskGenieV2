using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class PlanRepository : IPlanRepository
{
    private readonly AppDbContext _context;

    public PlanRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Plan?> GetByIdAsync(int planId, CancellationToken ct = default)
    {
        return await _context.Plans.FirstOrDefaultAsync(p => p.PlanId == planId, ct);
    }

    public async Task<Plan?> GetByCodeAsync(string code, CancellationToken ct = default)
    {
        return await _context.Plans.FirstOrDefaultAsync(p => p.Code == code, ct);
    }

    public async Task<List<Plan>> GetActiveAsync(string? scope = null, CancellationToken ct = default)
    {
        var query = _context.Plans.Where(p => p.IsActive);
        if (!string.IsNullOrWhiteSpace(scope))
            query = query.Where(p => p.Scope == scope);

        return await query.OrderBy(p => p.PriceCents).ToListAsync(ct);
    }

    public async Task<List<Plan>> GetAllAsync(CancellationToken ct = default)
    {
        return await _context.Plans.OrderBy(p => p.Scope).ThenBy(p => p.PriceCents).ToListAsync(ct);
    }

    public async Task AddAsync(Plan plan, CancellationToken ct = default)
    {
        await _context.Plans.AddAsync(plan, ct);
        await _context.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(Plan plan, CancellationToken ct = default)
    {
        _context.Plans.Update(plan);
        await _context.SaveChangesAsync(ct);
    }
}
