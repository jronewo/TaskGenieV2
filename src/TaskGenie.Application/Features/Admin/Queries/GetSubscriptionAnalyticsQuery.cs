using MediatR;
using TaskGenie.Application.Features.Admin.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Admin.Queries;

/// <summary>Subscription-registration chart data: count per (year, month, scope, plan) bucket,
/// covering the last MonthsBack months (default 6).</summary>
public sealed record GetSubscriptionAnalyticsQuery(int MonthsBack = 6) : IRequest<List<SubscriptionAnalyticsPointDto>>;

public sealed class GetSubscriptionAnalyticsQueryHandler(ISubscriptionRepository subscriptionRepo)
    : IRequestHandler<GetSubscriptionAnalyticsQuery, List<SubscriptionAnalyticsPointDto>>
{
    public async Task<List<SubscriptionAnalyticsPointDto>> Handle(GetSubscriptionAnalyticsQuery query, CancellationToken ct)
    {
        var monthsBack = query.MonthsBack <= 0 ? 6 : query.MonthsBack;
        var cutoff = DateTime.UtcNow.AddMonths(-monthsBack);

        var subscriptions = await subscriptionRepo.GetAllAsync(ct);

        return subscriptions
            .Where(s => s.CreatedAt >= cutoff)
            .GroupBy(s => new
            {
                s.CreatedAt.Year,
                s.CreatedAt.Month,
                Scope = s.SubscriberOrganizationId is not null ? "Organization" : "Personal",
                s.Plan.Code,
                s.Plan.Name
            })
            .Select(g => new SubscriptionAnalyticsPointDto
            {
                Year = g.Key.Year,
                Month = g.Key.Month,
                Scope = g.Key.Scope,
                PlanCode = g.Key.Code,
                PlanName = g.Key.Name,
                Count = g.Count()
            })
            .OrderBy(p => p.Year).ThenBy(p => p.Month).ThenBy(p => p.Scope).ThenBy(p => p.PlanCode)
            .ToList();
    }
}
