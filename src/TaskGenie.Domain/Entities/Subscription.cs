using System;

namespace TaskGenie.Domain.Entities;

/// <summary>A subscription is owned by exactly one of a User or an Organization (XOR).
/// Lifecycle: PENDING → ACTIVE → (CANCELED | EXPIRED).</summary>
public class Subscription
{
    protected Subscription() { }

    public int SubscriptionId { get; internal set; }

    public int PlanId { get; internal set; }

    /// <summary>PERSONAL | ORGANIZATION</summary>
    public string OwnerType { get; internal set; } = PlanAudiences.Personal;

    public int? UserId { get; internal set; }

    public int? OrganizationId { get; internal set; }

    /// <summary>PENDING | ACTIVE | CANCELED | EXPIRED</summary>
    public string Status { get; internal set; } = SubscriptionStatuses.Pending;

    public DateTime? StartedAt { get; internal set; }

    public DateTime? CurrentPeriodEnd { get; internal set; }

    public DateTime? CanceledAt { get; internal set; }

    public bool CancelAtPeriodEnd { get; internal set; }

    public DateTime CreatedAt { get; internal set; }

    public DateTime? UpdatedAt { get; internal set; }

    public virtual Plan? Plan { get; internal set; }
    public virtual User? User { get; internal set; }
    public virtual Organization? Organization { get; internal set; }

    /// <summary>Active and not past its period end — the only state that grants entitlements.</summary>
    public bool IsEffective =>
        Status == SubscriptionStatuses.Active
        && (CurrentPeriodEnd is null || CurrentPeriodEnd > DateTime.UtcNow);

    public static Subscription CreateForUser(int planId, int userId)
        => new()
        {
            PlanId = planId,
            OwnerType = PlanAudiences.Personal,
            UserId = userId,
            Status = SubscriptionStatuses.Pending,
            CreatedAt = DateTime.UtcNow
        };

    public static Subscription CreateForOrganization(int planId, int organizationId)
        => new()
        {
            PlanId = planId,
            OwnerType = PlanAudiences.Organization,
            OrganizationId = organizationId,
            Status = SubscriptionStatuses.Pending,
            CreatedAt = DateTime.UtcNow
        };

    public void Activate(DateTime periodEnd)
    {
        Status = SubscriptionStatuses.Active;
        StartedAt ??= DateTime.UtcNow;
        CurrentPeriodEnd = periodEnd;
        CanceledAt = null;
        CancelAtPeriodEnd = false;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Cancel at period end keeps entitlements until the period expires; immediate
    /// cancellation drops them straight away.</summary>
    public void Cancel(bool atPeriodEnd)
    {
        CanceledAt = DateTime.UtcNow;
        CancelAtPeriodEnd = atPeriodEnd;
        if (!atPeriodEnd)
        {
            Status = SubscriptionStatuses.Canceled;
            CurrentPeriodEnd = DateTime.UtcNow;
        }
        UpdatedAt = DateTime.UtcNow;
    }

    public void Expire()
    {
        Status = SubscriptionStatuses.Expired;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkCanceled()
    {
        Status = SubscriptionStatuses.Canceled;
        UpdatedAt = DateTime.UtcNow;
    }
}

public static class SubscriptionStatuses
{
    public const string Pending = "PENDING";
    public const string Active = "ACTIVE";
    public const string Canceled = "CANCELED";
    public const string Expired = "EXPIRED";
}
