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

    /// <summary>
    /// Whether this plan includes the AI assistant. Kept as its own flag rather than inferred from
    /// the price: "paid" and "has the chatbot" are two different product decisions, and an admin
    /// creating a cheap plan without the assistant must not have to make it free to do so.
    /// </summary>
    public bool AiChatbotEnabled { get; internal set; }

    /// <summary>
    /// How long one paid period lasts, in days. Null falls back to <see cref="BillingInterval"/>
    /// (30 days monthly, 365 yearly) — it exists so an admin can sell a 7-day or 90-day plan
    /// without inventing a new billing interval.
    /// </summary>
    public int? DurationDays { get; internal set; }

    public bool IsActive { get; internal set; } = true;

    public int SortOrder { get; internal set; }

    public DateTime CreatedAt { get; internal set; }

    public DateTime? UpdatedAt { get; internal set; }

    public bool IsFree => PriceMinor == 0;

    public static Plan Create(
        string code, string name, string audience, string billingInterval,
        int priceMinor, string currency, int? projectLimit, int? memberLimit, int sortOrder = 0,
        bool aiChatbotEnabled = false, int? durationDays = null)
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
            AiChatbotEnabled = aiChatbotEnabled,
            DurationDays = durationDays,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

    /// <summary>
    /// Replaces the editable fields wholesale, because the admin edits a form.
    ///
    /// A partial "only apply what is non-null" update could never express "make this unlimited" —
    /// null meant both "leave alone" and "no limit". Here null on a limit unambiguously means
    /// unlimited, which is what the Unlimited checkbox sends.
    /// </summary>
    public void Update(
        string name, int priceMinor, int? projectLimit, int? memberLimit, int sortOrder,
        bool aiChatbotEnabled, int? durationDays)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Plan name is required.", nameof(name));
        if (priceMinor < 0) throw new ArgumentOutOfRangeException(nameof(priceMinor), "Price cannot be negative.");
        if (projectLimit is < 0) throw new ArgumentOutOfRangeException(nameof(projectLimit), "Project limit cannot be negative.");
        if (durationDays is < 1) throw new ArgumentOutOfRangeException(nameof(durationDays), "Duration must be at least one day.");

        Name = name;
        PriceMinor = priceMinor;
        ProjectLimit = projectLimit;
        MemberLimit = memberLimit;
        SortOrder = sortOrder;
        AiChatbotEnabled = aiChatbotEnabled;
        DurationDays = durationDays;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Length of one paid period. Falls back to the billing interval when no explicit duration was
    /// configured, so every existing plan keeps the period length it already had.
    /// </summary>
    public int EffectiveDurationDays => DurationDays ?? BillingInterval switch
    {
        PlanBillingIntervals.Yearly => 365,
        PlanBillingIntervals.Monthly => 30,
        _ => 30,
    };

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
