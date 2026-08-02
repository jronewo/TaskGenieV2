using System;

namespace TaskGenie.Domain.Entities;

/// <summary>A purchasable plan. Money is stored in integer minor units (cents) — never floating
/// point. <see cref="ProjectLimit"/> null means unlimited.</summary>
public class Plan
{
    protected Plan() { }

    public int PlanId { get; internal set; }

    public string Code { get; internal set; } = null!;

    public string Name { get; internal set; } = null!;

    /// <summary>PERSONAL | ORGANIZATION</summary>
    public string Audience { get; internal set; } = PlanAudiences.Personal;

    /// <summary>MONTHLY | YEARLY | NONE (for free plans)</summary>
    public string BillingInterval { get; internal set; } = PlanBillingIntervals.None;

    public int PriceMinor { get; internal set; }

    public string Currency { get; internal set; } = "USD";

    /// <summary>null = unlimited.</summary>
    public int? ProjectLimit { get; internal set; }

    /// <summary>null = unlimited.</summary>
    public int? MemberLimit { get; internal set; }

    public bool IsActive { get; internal set; } = true;

    public int SortOrder { get; internal set; }

    public DateTime CreatedAt { get; internal set; }

    public DateTime? UpdatedAt { get; internal set; }

    public bool IsFree => PriceMinor == 0;

    public static Plan Create(
        string code, string name, string audience, string billingInterval,
        int priceMinor, string currency, int? projectLimit, int? memberLimit, int sortOrder = 0)
        => new()
        {
            Code = code,
            Name = name,
            Audience = audience,
            BillingInterval = billingInterval,
            PriceMinor = priceMinor,
            Currency = currency,
            ProjectLimit = projectLimit,
            MemberLimit = memberLimit,
            SortOrder = sortOrder,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

    public void Update(string? name, int? priceMinor, int? projectLimit, int? memberLimit, int? sortOrder)
    {
        if (!string.IsNullOrWhiteSpace(name)) Name = name;
        if (priceMinor.HasValue) PriceMinor = priceMinor.Value;
        if (projectLimit.HasValue) ProjectLimit = projectLimit.Value;
        if (memberLimit.HasValue) MemberLimit = memberLimit.Value;
        if (sortOrder.HasValue) SortOrder = sortOrder.Value;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Archived plans stay referenced by existing subscriptions but accept no new checkout.</summary>
    public void SetActive(bool isActive)
    {
        IsActive = isActive;
        UpdatedAt = DateTime.UtcNow;
    }
}

public static class PlanAudiences
{
    public const string Personal = "PERSONAL";
    public const string Organization = "ORGANIZATION";

    public static bool IsValid(string a) => a is Personal or Organization;
}

public static class PlanBillingIntervals
{
    public const string None = "NONE";
    public const string Monthly = "MONTHLY";
    public const string Yearly = "YEARLY";

    public static bool IsValid(string i) => i is None or Monthly or Yearly;
}
