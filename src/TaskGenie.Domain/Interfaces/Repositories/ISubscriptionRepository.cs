using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface ISubscriptionRepository
{
    System.Threading.Tasks.Task<Subscription?> GetByIdAsync(int subscriptionId, CancellationToken ct = default);

    /// <summary>The subscriber's most recently created subscription (any status), if any.</summary>
    System.Threading.Tasks.Task<Subscription?> GetLatestForUserAsync(int userId, CancellationToken ct = default);
    System.Threading.Tasks.Task<Subscription?> GetLatestForOrganizationAsync(int organizationId, CancellationToken ct = default);

    System.Threading.Tasks.Task<List<Subscription>> GetHistoryForUserAsync(int userId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<Subscription>> GetHistoryForOrganizationAsync(int organizationId, CancellationToken ct = default);

    /// <summary>All subscriptions across every subscriber — for admin listing/analytics only.</summary>
    System.Threading.Tasks.Task<List<Subscription>> GetAllAsync(CancellationToken ct = default);

    System.Threading.Tasks.Task AddAsync(Subscription subscription, CancellationToken ct = default);
    System.Threading.Tasks.Task UpdateAsync(Subscription subscription, CancellationToken ct = default);
}
