using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface IPlanRepository
{
    System.Threading.Tasks.Task<Plan?> GetByIdAsync(int planId, CancellationToken ct = default);
    System.Threading.Tasks.Task<Plan?> GetByCodeAsync(string code, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<Plan>> GetAllAsync(bool activeOnly, string? audience, CancellationToken ct = default);
    System.Threading.Tasks.Task AddAsync(Plan plan, CancellationToken ct = default);
    System.Threading.Tasks.Task UpdateAsync(Plan plan, CancellationToken ct = default);
}

public interface ISubscriptionRepository
{
    System.Threading.Tasks.Task<Subscription?> GetByIdAsync(int subscriptionId, CancellationToken ct = default);

    /// <summary>The subscription that currently grants entitlements to the user, if any.</summary>
    System.Threading.Tasks.Task<Subscription?> GetEffectiveForUserAsync(int userId, CancellationToken ct = default);

    /// <summary>The subscription that currently grants entitlements to the organization, if any.</summary>
    System.Threading.Tasks.Task<Subscription?> GetEffectiveForOrganizationAsync(int organizationId, CancellationToken ct = default);

    System.Threading.Tasks.Task<List<Subscription>> GetAllAsync(string? status, CancellationToken ct = default);
    System.Threading.Tasks.Task AddAsync(Subscription subscription, CancellationToken ct = default);
    System.Threading.Tasks.Task UpdateAsync(Subscription subscription, CancellationToken ct = default);
}

public interface IPaymentTransactionRepository
{
    System.Threading.Tasks.Task<PaymentTransaction?> GetByIdAsync(int paymentTransactionId, CancellationToken ct = default);
    System.Threading.Tasks.Task<PaymentTransaction?> GetByIdempotencyKeyAsync(string idempotencyKey, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<PaymentTransaction>> GetForUserAsync(int userId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<PaymentTransaction>> GetForOrganizationAsync(int organizationId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<PaymentTransaction>> GetAllAsync(string? status, CancellationToken ct = default);
    System.Threading.Tasks.Task AddAsync(PaymentTransaction payment, CancellationToken ct = default);
    System.Threading.Tasks.Task UpdateAsync(PaymentTransaction payment, CancellationToken ct = default);
}
