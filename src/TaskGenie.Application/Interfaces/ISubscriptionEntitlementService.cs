using TaskGenie.Application.Features.Subscriptions.DTOs;
using TaskGenie.Domain.Entities;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Application.Interfaces;

/// <summary>Resolves the effective plan/quota for a subscriber. This is the single source of
/// truth for project-quota enforcement — callers must never infer entitlement from
/// client-supplied data.</summary>
public interface ISubscriptionEntitlementService
{
    Task<EntitlementDto> GetPersonalEntitlementAsync(int userId, CancellationToken ct = default);
    Task<EntitlementDto> GetOrganizationEntitlementAsync(int organizationId, CancellationToken ct = default);

    /// <summary>Throws InvalidOperationException if the user's personal project quota is exhausted.</summary>
    Task EnsureCanCreatePersonalProjectAsync(int userId, CancellationToken ct = default);

    /// <summary>Throws InvalidOperationException if the organization's project quota is exhausted.</summary>
    Task EnsureCanCreateOrganizationProjectAsync(int organizationId, CancellationToken ct = default);

    Task<Subscription?> GetActiveSubscriptionForUserAsync(int userId, CancellationToken ct = default);
    Task<Subscription?> GetActiveSubscriptionForOrganizationAsync(int organizationId, CancellationToken ct = default);

    /// <summary>Resolved fresh on every call from the organization's *current* active
    /// subscription — never persisted on the user, so a lapsed/canceled org subscription
    /// immediately stops granting premium to its members without any migration/cleanup.</summary>
    Task<bool> IsOrganizationMemberPremiumAsync(int organizationId, int userId, CancellationToken ct = default);
}
