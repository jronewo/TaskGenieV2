using System;
using System.Collections.Generic;

namespace TaskGenie.Domain.Entities;

public class Plan
{
    protected Plan() { }

    public int PlanId { get; internal set; }

    public string Code { get; internal set; } = null!;

    public string Name { get; internal set; } = null!;

    /// <summary>"Personal" or "Organization" — which subscriber kind this plan can be bought for.</summary>
    public string Scope { get; internal set; } = null!;

    public int PriceCents { get; internal set; }

    public string Currency { get; internal set; } = "USD";

    public int BillingPeriodDays { get; internal set; }

    /// <summary>Max concurrent projects the subscriber may own. Null = unlimited.</summary>
    public int? ProjectLimit { get; internal set; }

    public string? Features { get; internal set; }

    public bool IsActive { get; internal set; } = true;

    public DateTime? CreatedAt { get; internal set; }

    public virtual ICollection<Subscription> Subscriptions { get; internal set; } = new List<Subscription>();

    public static Plan Create(
        string code,
        string name,
        string scope,
        int priceCents,
        int billingPeriodDays,
        int? projectLimit,
        string? features = null,
        bool isActive = true) => new()
    {
        Code = code,
        Name = name,
        Scope = scope,
        PriceCents = priceCents,
        BillingPeriodDays = billingPeriodDays,
        ProjectLimit = projectLimit,
        Features = features,
        IsActive = isActive,
        CreatedAt = DateTime.UtcNow
    };

    /// <summary>Full-replace update of the plan's editable fields. ProjectLimit's own null
    /// value already means "unlimited", so this never needs a separate "don't touch" sentinel
    /// — admins always supply the complete intended shape.</summary>
    public void Update(string name, int priceCents, int billingPeriodDays, int? projectLimit, string? features)
    {
        Name = name;
        PriceCents = priceCents;
        BillingPeriodDays = billingPeriodDays;
        ProjectLimit = projectLimit;
        Features = features;
    }

    public void Activate() => IsActive = true;

    public void Deactivate() => IsActive = false;
}
