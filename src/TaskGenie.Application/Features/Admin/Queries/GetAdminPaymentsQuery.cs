using MediatR;
using TaskGenie.Application.Common.Models;
using TaskGenie.Application.Features.Admin.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Admin.Queries;

public sealed record GetAdminPaymentsQuery(
    int Page = 1,
    int PageSize = 20,
    string? Status = null,
    string? Scope = null,
    int? PlanId = null,
    DateTime? From = null,
    DateTime? To = null
) : IRequest<PagedResult<AdminPaymentDto>>;

public sealed class GetAdminPaymentsQueryHandler(IPaymentTransactionRepository paymentRepo)
    : IRequestHandler<GetAdminPaymentsQuery, PagedResult<AdminPaymentDto>>
{
    public async Task<PagedResult<AdminPaymentDto>> Handle(GetAdminPaymentsQuery query, CancellationToken ct)
    {
        var payments = await paymentRepo.GetAllAsync(ct);

        IEnumerable<Domain.Entities.PaymentTransaction> filtered = payments;
        if (!string.IsNullOrWhiteSpace(query.Status))
            filtered = filtered.Where(p => string.Equals(p.Status, query.Status, StringComparison.OrdinalIgnoreCase));
        if (!string.IsNullOrWhiteSpace(query.Scope))
        {
            var wantsOrg = string.Equals(query.Scope, "Organization", StringComparison.OrdinalIgnoreCase);
            filtered = filtered.Where(p => (p.Subscription.SubscriberOrganizationId is not null) == wantsOrg);
        }
        if (query.PlanId is int planId)
            filtered = filtered.Where(p => p.Subscription.PlanId == planId);
        if (query.From is DateTime from)
            filtered = filtered.Where(p => p.CreatedAt >= from);
        if (query.To is DateTime to)
            filtered = filtered.Where(p => p.CreatedAt <= to);

        var dtos = filtered.Select(AdminPaymentDto.FromEntity);
        return PagedResult<AdminPaymentDto>.Create(dtos, query.Page, query.PageSize);
    }
}
