namespace TaskGenie.Application.Features.Subscriptions.DTOs;

public sealed class SubscriptionSummaryDto
{
    public SubscriptionDto? ActiveSubscription { get; init; }
    public EntitlementDto Entitlement { get; init; } = null!;
}
