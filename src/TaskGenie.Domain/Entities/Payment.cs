using System;

namespace TaskGenie.Domain.Entities;

/// <summary>
/// Well-known values for <see cref="Payment.Provider"/>. Only payOS is supported today; kept as a
/// named constant (rather than a hardcoded literal scattered around) so a future gateway is a
/// small diff, not a search-and-replace.
/// </summary>
public static class PaymentProviders
{
    public const string PayOS = "PayOS";
}

/// <summary>
/// Well-known values for <see cref="Payment.Purpose"/>.
/// </summary>
public static class PaymentPurposes
{
    public const string OrganizationUpgrade = "OrganizationUpgrade";
    public const string AiQuotaTopUp = "AiQuotaTopUp";
    public const string UserUpgrade = "UserUpgrade";
}

/// <summary>
/// Well-known values for <see cref="Payment.Status"/>.
/// </summary>
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

    /// <summary>
    /// Unique order code sent to payOS. Used to correlate the webhook callback back to this record.
    /// </summary>
    public long OrderCode { get; internal set; }

    /// <summary>Null for a <see cref="PaymentPurposes.UserUpgrade"/> payment — those belong to a user directly, not an organization.</summary>
    public int? OrganizationId { get; internal set; }

    /// <summary>Always "PayOS" today — see <see cref="PaymentProviders"/>.</summary>
    public string Provider { get; internal set; } = null!;

    /// <summary>"OrganizationUpgrade" / "AiQuotaTopUp" / "UserUpgrade" — see <see cref="PaymentPurposes"/>.</summary>
    public string Purpose { get; internal set; } = null!;

    /// <summary>Optional catalog code, e.g. "PRO_MONTHLY" or "AI_QUOTA_200" — see PaymentCatalog.</summary>
    public string? PackageCode { get; internal set; }

    /// <summary>Amount in VND (no decimals — VND has no minor unit).</summary>
    public long Amount { get; internal set; }

    /// <summary>Pending / Paid / Failed / Cancelled / Expired — see <see cref="PaymentStatuses"/>.</summary>
    public string Status { get; internal set; } = PaymentStatuses.Pending;

    public string? ProviderTransactionId { get; internal set; }

    /// <summary>Raw webhook payload, kept for reconciliation/audit.</summary>
    public string? RawWebhookPayload { get; internal set; }

    public int RequestedByUserId { get; internal set; }

    public DateTime CreatedAt { get; internal set; }

    public DateTime? PaidAt { get; internal set; }

    public DateTime? ExpiresAt { get; internal set; }

    public virtual Organization? Organization { get; internal set; }

    public bool IsPending => Status == PaymentStatuses.Pending;

    public static Payment Create(
        long orderCode,
        int? organizationId,
        string purpose,
        string? packageCode,
        long amount,
        int requestedByUserId,
        DateTime? expiresAt = null) => new()
    {
        OrderCode = orderCode,
        OrganizationId = organizationId,
        Provider = PaymentProviders.PayOS,
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
