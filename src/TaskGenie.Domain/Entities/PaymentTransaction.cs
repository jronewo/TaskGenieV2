using System;

namespace TaskGenie.Domain.Entities;

/// <summary>A payment attempt. <see cref="IdempotencyKey"/> is uniquely indexed so a duplicated
/// checkout or a replayed provider callback cannot create or settle the same payment twice.</summary>
public class PaymentTransaction
{
    protected PaymentTransaction() { }

    public int PaymentTransactionId { get; internal set; }

    public int SubscriptionId { get; internal set; }

    public int PlanId { get; internal set; }

    public int? UserId { get; internal set; }

    public int? OrganizationId { get; internal set; }

    public int AmountMinor { get; internal set; }

    public string Currency { get; internal set; } = "USD";

    /// <summary>PENDING | SUCCEEDED | FAILED | CANCELED | REFUNDED | EXPIRED</summary>
    public string Status { get; internal set; } = PaymentStatuses.Pending;

    public string IdempotencyKey { get; internal set; } = null!;

    public string Provider { get; internal set; } = "FAKE";

    public string? ProviderReference { get; internal set; }

    /// <summary>True for anything created by the simulated provider. Production reporting excludes
    /// these by default.</summary>
    public bool IsTest { get; internal set; }

    public DateTime CreatedAt { get; internal set; }

    public DateTime? CompletedAt { get; internal set; }

    public virtual Subscription? Subscription { get; internal set; }
    public virtual Plan? Plan { get; internal set; }

    public bool IsSettled => Status != PaymentStatuses.Pending;

    public static PaymentTransaction Create(
        int subscriptionId, int planId, int? userId, int? organizationId,
        int amountMinor, string currency, string idempotencyKey, string provider, bool isTest)
        => new()
        {
            SubscriptionId = subscriptionId,
            PlanId = planId,
            UserId = userId,
            OrganizationId = organizationId,
            AmountMinor = amountMinor,
            Currency = currency,
            IdempotencyKey = idempotencyKey,
            Provider = provider,
            IsTest = isTest,
            Status = PaymentStatuses.Pending,
            CreatedAt = DateTime.UtcNow
        };

    public void Settle(string status, string? providerReference = null)
    {
        Status = status;
        ProviderReference = providerReference ?? ProviderReference;
        CompletedAt = DateTime.UtcNow;
    }

    /// <summary>Clears the completion stamp for a payment that is still awaiting settlement.</summary>
    public void ClearCompletion() => CompletedAt = null;
}

public static class PaymentStatuses
{
    public const string Pending = "PENDING";
    public const string Succeeded = "SUCCEEDED";
    public const string Failed = "FAILED";
    public const string Canceled = "CANCELED";
    public const string Refunded = "REFUNDED";
    public const string Expired = "EXPIRED";

    /// <summary>Statuses the test-only simulate endpoint accepts.</summary>
    public static readonly string[] Simulatable =
        [Succeeded, Failed, Canceled, Refunded, Expired];

    public static bool IsSimulatable(string status) => Array.Exists(Simulatable, s => s == status);
}
