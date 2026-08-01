using TaskGenie.Domain.Entities;

namespace TaskGenie.Application.Features.Subscriptions.DTOs;

public sealed class PaymentTransactionDto
{
    public int PaymentTransactionId { get; init; }
    public int SubscriptionId { get; init; }
    public int AmountCents { get; init; }
    public string Currency { get; init; } = null!;
    public string GatewayReference { get; init; } = null!;
    public string Status { get; init; } = null!;
    public DateTime CreatedAt { get; init; }
    public DateTime? ConfirmedAt { get; init; }
    public string? PlanCode { get; init; }
    public string? PlanName { get; init; }

    public static PaymentTransactionDto FromEntity(PaymentTransaction p) => new()
    {
        PaymentTransactionId = p.PaymentTransactionId,
        SubscriptionId = p.SubscriptionId,
        AmountCents = p.AmountCents,
        Currency = p.Currency,
        GatewayReference = p.GatewayReference,
        Status = p.Status,
        CreatedAt = p.CreatedAt,
        ConfirmedAt = p.ConfirmedAt,
        PlanCode = p.Subscription?.Plan?.Code,
        PlanName = p.Subscription?.Plan?.Name
    };
}
