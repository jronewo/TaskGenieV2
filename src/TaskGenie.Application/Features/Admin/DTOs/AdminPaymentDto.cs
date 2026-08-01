using TaskGenie.Domain.Entities;

namespace TaskGenie.Application.Features.Admin.DTOs;

public sealed class AdminPaymentDto
{
    public int PaymentTransactionId { get; init; }
    public int SubscriptionId { get; init; }
    public string SubscriberType { get; init; } = null!;
    public int SubscriberId { get; init; }
    public string? SubscriberName { get; init; }
    public string PlanCode { get; init; } = null!;
    public string PlanName { get; init; } = null!;
    public int AmountCents { get; init; }
    public string Currency { get; init; } = null!;
    public string Status { get; init; } = null!;
    public string GatewayReference { get; init; } = null!;
    public DateTime CreatedAt { get; init; }
    public DateTime? ConfirmedAt { get; init; }

    public static AdminPaymentDto FromEntity(PaymentTransaction p) => new()
    {
        PaymentTransactionId = p.PaymentTransactionId,
        SubscriptionId = p.SubscriptionId,
        SubscriberType = p.Subscription.SubscriberOrganizationId is not null ? "Organization" : "Personal",
        SubscriberId = p.Subscription.SubscriberOrganizationId ?? p.Subscription.SubscriberUserId ?? 0,
        SubscriberName = p.Subscription.SubscriberOrganization?.Name ?? p.Subscription.SubscriberUser?.Name,
        PlanCode = p.Subscription.Plan.Code,
        PlanName = p.Subscription.Plan.Name,
        AmountCents = p.AmountCents,
        Currency = p.Currency,
        Status = p.Status,
        GatewayReference = p.GatewayReference,
        CreatedAt = p.CreatedAt,
        ConfirmedAt = p.ConfirmedAt
    };
}
