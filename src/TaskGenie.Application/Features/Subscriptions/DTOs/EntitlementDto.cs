namespace TaskGenie.Application.Features.Subscriptions.DTOs;

/// <summary>Server-resolved entitlement for a subscriber (personal user or organization).
/// Always derived from the subscriber's active Subscription row (or the hardcoded free
/// fallback when none exists) — never from client-supplied plan/premium flags.</summary>
public sealed class EntitlementDto
{
    public string PlanCode { get; init; } = null!;
    public string PlanName { get; init; } = null!;
    public bool IsUnlimited { get; init; }
    public int? ProjectLimit { get; init; }
    public int CurrentProjectCount { get; init; }
    public int? RemainingProjects { get; init; }
    public bool CanCreateProject { get; init; }
    public string SubscriptionStatus { get; init; } = null!;
    public DateTime? CurrentPeriodEnd { get; init; }
    public int? ActiveSubscriptionId { get; init; }
}
