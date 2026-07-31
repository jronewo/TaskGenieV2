using System;

namespace TaskGenie.Domain.Entities;


public static class PaymentProviders
{
    public const string PayOS = "PayOS";
    public const string Momo = "Momo";
}

public static class PaymentPurposes
{
    public const string OrganizationUpgrade = "OrganizationUpgrade";
    public const string AiQuotaTopUp = "AiQuotaTopUp";
}

public static class PaymentStatuses
{
    public const string Pending = "Pending";
    public const string Paid = "Paid";
    public const string Failed = "Failed";
    public const string Cancelled = "Cancelled";
    public const string Expired = "Expired";
}

public class Payment
{
    protected Payment() { }

    public int PaymentId { get; internal set; }

  
    public long OrderCode { get; internal set; }

    public int OrganizationId { get; internal set; }

    /// <summary>"PayOS" or "Momo" — see <see cref="PaymentProviders"
    public string Provider { get; internal set; } = null!;

    /// <summary>"OrganizationUpgrade" or "AiQuotaTopUp" — see <see cref="PaymentPurposes"/>.</summary>
    public string Purpose { get; internal set; } = null!;


    public string? PackageCode { get; internal set; }

    public long Amount { get; internal set; }

    /// <summary>Pending / Paid / Failed / Cancelled / Expired — see <see cref="PaymentStatuses"/>.</summary>
    public string Status { get; internal set; } = PaymentStatuses.Pending;

    public string? ProviderTransactionId { get; internal set; }

    public string? RawWebhookPayload { get; internal set; }

    public int RequestedByUserId { get; internal set; }

    public DateTime CreatedAt { get; internal set; }

    public DateTime? PaidAt { get; internal set; }

    public DateTime? ExpiresAt { get; internal set; }

    public virtual Organization? Organization { get; internal set; }

    public bool IsPending => Status == PaymentStatuses.Pending;

    public static Payment Create(
        long orderCode,
        int organizationId,
        string provider,
        string purpose,
        string? packageCode,
        long amount,
        int requestedByUserId,
        DateTime? expiresAt = null) => new()
    {
        OrderCode = orderCode,
        OrganizationId = organizationId,
        Provider = provider,
        Purpose = purpose,
        PackageCode = packageCode,
        Amount = amount,
        Status = PaymentStatuses.Pending,
        RequestedByUserId = requestedByUserId,
        CreatedAt = DateTime.UtcNow,
        ExpiresAt = expiresAt
    };

    /// <summary>
    /// Marks the payment as paid. Idempotent: calling this more than once (e.g. because the
    /// gateway retried the webhook) is a no-op after the first successful call, so callers never
    /// double-apply the payment's effect (upgrading a plan, adding AI quota, etc).
    /// </summary>
    public bool MarkPaid(string? providerTransactionId, string? rawPayload)
    {
        if (Status == PaymentStatuses.Paid) return false;

        Status = PaymentStatuses.Paid;
        ProviderTransactionId = providerTransactionId;
        RawWebhookPayload = rawPayload;
        PaidAt = DateTime.UtcNow;
        return true;
    }

    public void MarkFailed(string? rawPayload)
    {
        if (Status == PaymentStatuses.Paid) return;
        Status = PaymentStatuses.Failed;
        RawWebhookPayload = rawPayload;
    }

    public void MarkCancelled()
    {
        if (Status == PaymentStatuses.Paid) return;
        Status = PaymentStatuses.Cancelled;
    }

    public void MarkExpired()
    {
        if (Status == PaymentStatuses.Pending) Status = PaymentStatuses.Expired;
    }
}
