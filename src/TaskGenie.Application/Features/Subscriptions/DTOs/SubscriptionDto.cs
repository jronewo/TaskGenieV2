using TaskGenie.Domain.Entities;

namespace TaskGenie.Application.Features.Subscriptions.DTOs;

public sealed class SubscriptionDto
{
    public int SubscriptionId { get; init; }
    public int? SubscriberUserId { get; init; }
    public int? SubscriberOrganizationId { get; init; }
    public PlanDto Plan { get; init; } = null!;
    public string Status { get; init; } = null!;
    public DateTime? StartedAt { get; init; }
    public DateTime? CurrentPeriodEnd { get; init; }
    public DateTime? CanceledAt { get; init; }
    public DateTime CreatedAt { get; init; }

    public static SubscriptionDto FromEntity(Subscription s) => new()
    {
        SubscriptionId = s.SubscriptionId,
        SubscriberUserId = s.SubscriberUserId,
        SubscriberOrganizationId = s.SubscriberOrganizationId,
        Plan = PlanDto.FromEntity(s.Plan),
        Status = s.Status,
        StartedAt = s.StartedAt,
        CurrentPeriodEnd = s.CurrentPeriodEnd,
        CanceledAt = s.CanceledAt,
        CreatedAt = s.CreatedAt
    };
}
