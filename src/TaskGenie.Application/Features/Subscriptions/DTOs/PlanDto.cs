using TaskGenie.Domain.Entities;

namespace TaskGenie.Application.Features.Subscriptions.DTOs;

public sealed class PlanDto
{
    public int PlanId { get; init; }
    public string Code { get; init; } = null!;
    public string Name { get; init; } = null!;
    public string Scope { get; init; } = null!;
    public int PriceCents { get; init; }
    public string Currency { get; init; } = null!;
    public int BillingPeriodDays { get; init; }
    public int? ProjectLimit { get; init; }
    public string? Features { get; init; }
    public bool IsActive { get; init; }

    public static PlanDto FromEntity(Plan p) => new()
    {
        PlanId = p.PlanId,
        Code = p.Code,
        Name = p.Name,
        Scope = p.Scope,
        PriceCents = p.PriceCents,
        Currency = p.Currency,
        BillingPeriodDays = p.BillingPeriodDays,
        ProjectLimit = p.ProjectLimit,
        Features = p.Features,
        IsActive = p.IsActive
    };
}
