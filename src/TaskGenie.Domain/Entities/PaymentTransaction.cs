using System;

namespace TaskGenie.Domain.Entities;

public static class PaymentTransactionStatus
{
    public const string Pending = "Pending";
    public const string Succeeded = "Succeeded";
    public const string Failed = "Failed";
}

public class PaymentTransaction
{
    protected PaymentTransaction() { }

    public int PaymentTransactionId { get; internal set; }

    public int SubscriptionId { get; internal set; }

    public int AmountCents { get; internal set; }

    public string Currency { get; internal set; } = "USD";

    /// <summary>Opaque reference from the (simulated) payment gateway. Never a real charge.</summary>
    public string GatewayReference { get; internal set; } = null!;

    public string Status { get; internal set; } = PaymentTransactionStatus.Pending;

    public DateTime CreatedAt { get; internal set; }

    public DateTime? ConfirmedAt { get; internal set; }

    public virtual Subscription Subscription { get; internal set; } = null!;

    public static PaymentTransaction CreatePending(int subscriptionId, int amountCents, string currency, string gatewayReference) => new()
    {
        SubscriptionId = subscriptionId,
        AmountCents = amountCents,
        Currency = currency,
        GatewayReference = gatewayReference,
        Status = PaymentTransactionStatus.Pending,
        CreatedAt = DateTime.UtcNow
    };

    public void MarkSucceeded()
    {
        Status = PaymentTransactionStatus.Succeeded;
        ConfirmedAt = DateTime.UtcNow;
    }

    public void MarkFailed()
    {
        Status = PaymentTransactionStatus.Failed;
        ConfirmedAt = DateTime.UtcNow;
    }
}
