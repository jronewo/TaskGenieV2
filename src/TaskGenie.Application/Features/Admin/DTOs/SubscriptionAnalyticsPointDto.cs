namespace TaskGenie.Application.Features.Admin.DTOs;

/// <summary>One bucket in the subscriptions-over-time chart: a given (year, month, scope, plan)
/// combination and how many subscriptions were created in it.</summary>
public sealed class SubscriptionAnalyticsPointDto
{
    public int Year { get; init; }
    public int Month { get; init; }
    public string Scope { get; init; } = null!;
    public string PlanCode { get; init; } = null!;
    public string PlanName { get; init; } = null!;
    public int Count { get; init; }
}
