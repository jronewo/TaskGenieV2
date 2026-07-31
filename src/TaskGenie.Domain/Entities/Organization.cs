using System;
using System.Collections.Generic;

namespace TaskGenie.Domain.Entities;

/// <summary>
/// Well-known values for <see cref="Organization.Plan"/>.
/// </summary>
public static class OrganizationPlans
{
    public const string Free = "Free";
    public const string Pro = "Pro";
}

public class Organization
{
    protected Organization() { }

    public int OrganizationId { get; internal set; }

    public string Name { get; internal set; } = null!;

    public string? Description { get; internal set; }

    public string? Logo { get; internal set; }

    public int? OwnerId { get; internal set; }

    public DateTime? CreatedAt { get; internal set; }

    public DateTime? UpdatedAt { get; internal set; }

    /// <summary>"Free" or "Pro" — see <see cref="OrganizationPlans"/>. Defaults to Free.</summary>
    public string Plan { get; internal set; } = OrganizationPlans.Free;

    /// <summary>When the current Pro period ends. Null while on the Free plan.</summary>
    public DateTime? PlanExpiresAt { get; internal set; }

    /// <summary>Remaining AI-feature usage credits for the current period.</summary>
    public int AiQuota { get; internal set; } = DefaultFreeAiQuota;

    public const int DefaultFreeAiQuota = 50;

    public virtual User? Owner { get; internal set; }

    public virtual ICollection<Project> Projects { get; internal set; } = new List<Project>();

    public static Organization Create(string name, string? description, int ownerId) => new()
    {
        Name = name,
        Description = description,
        OwnerId = ownerId,
        CreatedAt = DateTime.UtcNow,
        Plan = OrganizationPlans.Free,
        AiQuota = DefaultFreeAiQuota
    };

    /// <summary>
    /// Applies a successful "upgrade to Pro" payment. If the org is already Pro and still within
    /// its current period, the new period is stacked on top instead of overwritten, so renewing
    /// early never loses paid-for time.
    /// </summary>
    public void UpgradeToPro(TimeSpan duration)
    {
        var baseline = Plan == OrganizationPlans.Pro && PlanExpiresAt is { } current && current > DateTime.UtcNow
            ? current
            : DateTime.UtcNow;

        Plan = OrganizationPlans.Pro;
        PlanExpiresAt = baseline.Add(duration);
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Called by a scheduled job once <see cref="PlanExpiresAt"/> has passed.</summary>
    public void DowngradeToFree()
    {
        Plan = OrganizationPlans.Free;
        PlanExpiresAt = null;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Applies a successful AI-quota top-up payment.</summary>
    public void AddAiQuota(int amount)
    {
        if (amount <= 0) return;
        AiQuota += amount;
        UpdatedAt = DateTime.UtcNow;
    }
}
