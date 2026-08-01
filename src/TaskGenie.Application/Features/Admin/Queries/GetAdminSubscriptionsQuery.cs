using MediatR;
using TaskGenie.Application.Common.Models;
using TaskGenie.Application.Features.Admin.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Admin.Queries;

public sealed record GetAdminSubscriptionsQuery(
    int Page = 1,
    int PageSize = 20,
    string? Status = null,
    string? Scope = null,
    int? PlanId = null
) : IRequest<PagedResult<AdminSubscriptionDto>>;

public sealed class GetAdminSubscriptionsQueryHandler(ISubscriptionRepository subscriptionRepo)
    : IRequestHandler<GetAdminSubscriptionsQuery, PagedResult<AdminSubscriptionDto>>
{
    public async Task<PagedResult<AdminSubscriptionDto>> Handle(GetAdminSubscriptionsQuery query, CancellationToken ct)
    {
        var subscriptions = await subscriptionRepo.GetAllAsync(ct);

        IEnumerable<Domain.Entities.Subscription> filtered = subscriptions;
        if (!string.IsNullOrWhiteSpace(query.Status))
            filtered = filtered.Where(s => string.Equals(s.Status, query.Status, StringComparison.OrdinalIgnoreCase));
        if (!string.IsNullOrWhiteSpace(query.Scope))
        {
            var wantsOrg = string.Equals(query.Scope, "Organization", StringComparison.OrdinalIgnoreCase);
            filtered = filtered.Where(s => (s.SubscriberOrganizationId is not null) == wantsOrg);
        }
        if (query.PlanId is int planId)
            filtered = filtered.Where(s => s.PlanId == planId);

        var dtos = filtered.Select(AdminSubscriptionDto.FromEntity);
        return PagedResult<AdminSubscriptionDto>.Create(dtos, query.Page, query.PageSize);
    }
}
