using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class PlanRepository(AppDbContext context) : IPlanRepository
{
    public async System.Threading.Tasks.Task<Plan?> GetByIdAsync(int planId, CancellationToken ct = default)
        => await context.Plans.SingleOrDefaultAsync(p => p.PlanId == planId, ct);

    public async System.Threading.Tasks.Task<Plan?> GetByCodeAsync(string code, CancellationToken ct = default)
        => await context.Plans.SingleOrDefaultAsync(p => p.Code == code, ct);

    public async System.Threading.Tasks.Task<List<Plan>> GetAllAsync(bool activeOnly, string? audience, CancellationToken ct = default)
    {
        var query = context.Plans.AsQueryable();
        if (activeOnly) query = query.Where(p => p.IsActive);
        if (!string.IsNullOrWhiteSpace(audience)) query = query.Where(p => p.Audience == audience);
        return await query.OrderBy(p => p.Audience).ThenBy(p => p.SortOrder).ThenBy(p => p.PriceMinor).ToListAsync(ct);
    }

    public async System.Threading.Tasks.Task AddAsync(Plan plan, CancellationToken ct = default)
    {
        await context.Plans.AddAsync(plan, ct);
        await context.SaveChangesAsync(ct);
    }

    public async System.Threading.Tasks.Task UpdateAsync(Plan plan, CancellationToken ct = default)
    {
        context.Plans.Update(plan);
        await context.SaveChangesAsync(ct);
    }
}

public class SubscriptionRepository(AppDbContext context) : ISubscriptionRepository
{
    public async System.Threading.Tasks.Task<Subscription?> GetByIdAsync(int subscriptionId, CancellationToken ct = default)
        => await context.Subscriptions.Include(s => s.Plan)
            .SingleOrDefaultAsync(s => s.SubscriptionId == subscriptionId, ct);

    public async System.Threading.Tasks.Task<Subscription?> GetEffectiveForUserAsync(int userId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        return await context.Subscriptions.Include(s => s.Plan)
            .Where(s => s.UserId == userId
                        && s.Status == SubscriptionStatuses.Active
                        && (s.CurrentPeriodEnd == null || s.CurrentPeriodEnd > now))
            .OrderByDescending(s => s.CurrentPeriodEnd)
            .FirstOrDefaultAsync(ct);
    }

    public async System.Threading.Tasks.Task<Subscription?> GetEffectiveForOrganizationAsync(int organizationId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        return await context.Subscriptions.Include(s => s.Plan)
            .Where(s => s.OrganizationId == organizationId
                        && s.Status == SubscriptionStatuses.Active
                        && (s.CurrentPeriodEnd == null || s.CurrentPeriodEnd > now))
            .OrderByDescending(s => s.CurrentPeriodEnd)
            .FirstOrDefaultAsync(ct);
    }

    public async System.Threading.Tasks.Task<List<Subscription>> GetAllAsync(string? status, CancellationToken ct = default)
    {
        var query = context.Subscriptions.Include(s => s.Plan).AsQueryable();
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(s => s.Status == status);
        return await query.OrderByDescending(s => s.CreatedAt).ToListAsync(ct);
    }

    public async System.Threading.Tasks.Task AddAsync(Subscription subscription, CancellationToken ct = default)
    {
        await context.Subscriptions.AddAsync(subscription, ct);
        await context.SaveChangesAsync(ct);
    }

    public async System.Threading.Tasks.Task UpdateAsync(Subscription subscription, CancellationToken ct = default)
    {
        context.Subscriptions.Update(subscription);
        await context.SaveChangesAsync(ct);
    }
}

public class PaymentTransactionRepository(AppDbContext context) : IPaymentTransactionRepository
{
    public async System.Threading.Tasks.Task<PaymentTransaction?> GetByIdAsync(int id, CancellationToken ct = default)
        => await context.PaymentTransactions.Include(p => p.Plan)
            .SingleOrDefaultAsync(p => p.PaymentTransactionId == id, ct);

    public async System.Threading.Tasks.Task<PaymentTransaction?> GetByIdempotencyKeyAsync(string idempotencyKey, CancellationToken ct = default)
        => await context.PaymentTransactions.Include(p => p.Plan)
            .SingleOrDefaultAsync(p => p.IdempotencyKey == idempotencyKey, ct);

    public async System.Threading.Tasks.Task<List<PaymentTransaction>> GetForUserAsync(int userId, CancellationToken ct = default)
        => await context.PaymentTransactions.Include(p => p.Plan)
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.CreatedAt).ToListAsync(ct);

    public async System.Threading.Tasks.Task<List<PaymentTransaction>> GetForOrganizationAsync(int organizationId, CancellationToken ct = default)
        => await context.PaymentTransactions.Include(p => p.Plan)
            .Where(p => p.OrganizationId == organizationId)
            .OrderByDescending(p => p.CreatedAt).ToListAsync(ct);

    public async System.Threading.Tasks.Task<List<PaymentTransaction>> GetAllAsync(string? status, CancellationToken ct = default)
    {
        var query = context.PaymentTransactions.Include(p => p.Plan).AsQueryable();
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(p => p.Status == status);
        return await query.OrderByDescending(p => p.CreatedAt).ToListAsync(ct);
    }

    public async System.Threading.Tasks.Task AddAsync(PaymentTransaction payment, CancellationToken ct = default)
    {
        await context.PaymentTransactions.AddAsync(payment, ct);
        await context.SaveChangesAsync(ct);
    }

    public async System.Threading.Tasks.Task UpdateAsync(PaymentTransaction payment, CancellationToken ct = default)
    {
        context.PaymentTransactions.Update(payment);
        await context.SaveChangesAsync(ct);
    }
}
