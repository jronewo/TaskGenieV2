using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class PaymentTransactionRepository : IPaymentTransactionRepository
{
    private readonly AppDbContext _context;

    public PaymentTransactionRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PaymentTransaction?> GetByIdAsync(int paymentTransactionId, CancellationToken ct = default)
    {
        return await _context.PaymentTransactions
            .Include(p => p.Subscription)
                .ThenInclude(s => s.Plan)
            .FirstOrDefaultAsync(p => p.PaymentTransactionId == paymentTransactionId, ct);
    }

    public async Task<List<PaymentTransaction>> GetBySubscriptionIdAsync(int subscriptionId, CancellationToken ct = default)
    {
        return await _context.PaymentTransactions
            .Where(p => p.SubscriptionId == subscriptionId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<List<PaymentTransaction>> GetForUserAsync(int userId, CancellationToken ct = default)
    {
        return await _context.PaymentTransactions
            .Include(p => p.Subscription)
                .ThenInclude(s => s.Plan)
            .Where(p => p.Subscription.SubscriberUserId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<List<PaymentTransaction>> GetForOrganizationAsync(int organizationId, CancellationToken ct = default)
    {
        return await _context.PaymentTransactions
            .Include(p => p.Subscription)
                .ThenInclude(s => s.Plan)
            .Where(p => p.Subscription.SubscriberOrganizationId == organizationId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<List<PaymentTransaction>> GetAllAsync(CancellationToken ct = default)
    {
        return await _context.PaymentTransactions
            .Include(p => p.Subscription)
                .ThenInclude(s => s.Plan)
            .Include(p => p.Subscription)
                .ThenInclude(s => s.SubscriberUser)
            .Include(p => p.Subscription)
                .ThenInclude(s => s.SubscriberOrganization)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task AddAsync(PaymentTransaction payment, CancellationToken ct = default)
    {
        await _context.PaymentTransactions.AddAsync(payment, ct);
        await _context.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(PaymentTransaction payment, CancellationToken ct = default)
    {
        _context.PaymentTransactions.Update(payment);
        await _context.SaveChangesAsync(ct);
    }
}
