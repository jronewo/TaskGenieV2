using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface IPaymentTransactionRepository
{
    System.Threading.Tasks.Task<PaymentTransaction?> GetByIdAsync(int paymentTransactionId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<PaymentTransaction>> GetBySubscriptionIdAsync(int subscriptionId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<PaymentTransaction>> GetForUserAsync(int userId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<PaymentTransaction>> GetForOrganizationAsync(int organizationId, CancellationToken ct = default);

    /// <summary>All payment transactions across every subscriber — for admin listing only.</summary>
    System.Threading.Tasks.Task<List<PaymentTransaction>> GetAllAsync(CancellationToken ct = default);
    System.Threading.Tasks.Task AddAsync(PaymentTransaction payment, CancellationToken ct = default);
    System.Threading.Tasks.Task UpdateAsync(PaymentTransaction payment, CancellationToken ct = default);
}
