using System;
using System.Collections.Generic;

namespace TaskGenie.Domain.Entities;

public static class SubscriptionStatus
{
    public const string PendingPayment = "PendingPayment";
    public const string Active = "Active";
    public const string Canceled = "Canceled";
    public const string Expired = "Expired";
}

public class Subscription
{
    protected Subscription() { }

    public int SubscriptionId { get; internal set; }

    /// <summary>Set when this is a personal subscription. Mutually exclusive with OrganizationId.</summary>
    public int? SubscriberUserId { get; internal set; }

    /// <summary>Set when this is an organization-wide subscription.</summary>
    public int? SubscriberOrganizationId { get; internal set; }

    public int PlanId { get; internal set; }

    public string Status { get; internal set; } = SubscriptionStatus.PendingPayment;

    public DateTime? StartedAt { get; internal set; }

    public DateTime? CurrentPeriodEnd { get; internal set; }

    public DateTime? CanceledAt { get; internal set; }

    public DateTime CreatedAt { get; internal set; }

    public DateTime? UpdatedAt { get; internal set; }

    public virtual Plan Plan { get; internal set; } = null!;

    public virtual User? SubscriberUser { get; internal set; }

    public virtual Organization? SubscriberOrganization { get; internal set; }

    public virtual ICollection<PaymentTransaction> Payments { get; internal set; } = new List<PaymentTransaction>();

    public static Subscription CreatePendingForUser(int userId, int planId) => new()
    {
        SubscriberUserId = userId,
        PlanId = planId,
        Status = SubscriptionStatus.PendingPayment,
        CreatedAt = DateTime.UtcNow
    };

    public static Subscription CreatePendingForOrganization(int organizationId, int planId) => new()
    {
        SubscriberOrganizationId = organizationId,
        PlanId = planId,
        Status = SubscriptionStatus.PendingPayment,
        CreatedAt = DateTime.UtcNow
    };

    public void Activate(int billingPeriodDays)
    {
        Status = SubscriptionStatus.Active;
        StartedAt = DateTime.UtcNow;
        CurrentPeriodEnd = DateTime.UtcNow.AddDays(billingPeriodDays);
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkFailed()
    {
        Status = SubscriptionStatus.Expired;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Cancel()
    {
        Status = SubscriptionStatus.Canceled;
        CanceledAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public bool IsCurrentlyActive =>
        Status == SubscriptionStatus.Active
        && (!CurrentPeriodEnd.HasValue || CurrentPeriodEnd.Value > DateTime.UtcNow);
}
