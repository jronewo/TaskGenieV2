using TaskGenie.Domain.Entities;

namespace TaskGenie.Application.Features.Admin.DTOs;

public sealed class AdminSubscriptionDto
{
    public int SubscriptionId { get; init; }
    public string SubscriberType { get; init; } = null!;
    public int SubscriberId { get; init; }
    public string? SubscriberName { get; init; }
    public string PlanCode { get; init; } = null!;
    public string PlanName { get; init; } = null!;
    public string Status { get; init; } = null!;
    public DateTime? StartedAt { get; init; }
    public DateTime? CurrentPeriodEnd { get; init; }
    public DateTime? CanceledAt { get; init; }
    public DateTime CreatedAt { get; init; }

    public static AdminSubscriptionDto FromEntity(Subscription s) => new()
    {
        SubscriptionId = s.SubscriptionId,
        SubscriberType = s.SubscriberOrganizationId is not null ? "Organization" : "Personal",
        SubscriberId = s.SubscriberOrganizationId ?? s.SubscriberUserId ?? 0,
        SubscriberName = s.SubscriberOrganization?.Name ?? s.SubscriberUser?.Name,
        PlanCode = s.Plan.Code,
        PlanName = s.Plan.Name,
        Status = s.Status,
        StartedAt = s.StartedAt,
        CurrentPeriodEnd = s.CurrentPeriodEnd,
        CanceledAt = s.CanceledAt,
        CreatedAt = s.CreatedAt
    };
}
