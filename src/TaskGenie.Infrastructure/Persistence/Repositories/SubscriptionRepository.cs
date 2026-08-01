using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class SubscriptionRepository : ISubscriptionRepository
{
    private readonly AppDbContext _context;

    public SubscriptionRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Subscription?> GetByIdAsync(int subscriptionId, CancellationToken ct = default)
    {
        return await _context.Subscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.SubscriptionId == subscriptionId, ct);
    }

    public async Task<Subscription?> GetLatestForUserAsync(int userId, CancellationToken ct = default)
    {
        return await _context.Subscriptions
            .Include(s => s.Plan)
            .Where(s => s.SubscriberUserId == userId)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync(ct);
    }

    public async Task<Subscription?> GetLatestForOrganizationAsync(int organizationId, CancellationToken ct = default)
    {
        return await _context.Subscriptions
            .Include(s => s.Plan)
            .Where(s => s.SubscriberOrganizationId == organizationId)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync(ct);
    }

    public async Task<List<Subscription>> GetHistoryForUserAsync(int userId, CancellationToken ct = default)
    {
        return await _context.Subscriptions
            .Include(s => s.Plan)
            .Where(s => s.SubscriberUserId == userId)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<List<Subscription>> GetHistoryForOrganizationAsync(int organizationId, CancellationToken ct = default)
    {
        return await _context.Subscriptions
            .Include(s => s.Plan)
            .Where(s => s.SubscriberOrganizationId == organizationId)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<List<Subscription>> GetAllAsync(CancellationToken ct = default)
    {
        return await _context.Subscriptions
            .Include(s => s.Plan)
            .Include(s => s.SubscriberUser)
            .Include(s => s.SubscriberOrganization)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task AddAsync(Subscription subscription, CancellationToken ct = default)
    {
        await _context.Subscriptions.AddAsync(subscription, ct);
        await _context.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(Subscription subscription, CancellationToken ct = default)
    {
        _context.Subscriptions.Update(subscription);
        await _context.SaveChangesAsync(ct);
    }
}
