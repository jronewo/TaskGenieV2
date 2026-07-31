using MediatR;
using TaskGenie.Application.Features.Payments.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Payments.Queries;

public sealed record GetOrganizationPaymentsQuery(int OrganizationId) : IRequest<List<PaymentDto>>;

public sealed class GetOrganizationPaymentsQueryHandler(IPaymentRepository paymentRepo)
    : IRequestHandler<GetOrganizationPaymentsQuery, List<PaymentDto>>
{
    public async Task<List<PaymentDto>> Handle(GetOrganizationPaymentsQuery query, CancellationToken ct)
    {
        var payments = await paymentRepo.GetByOrganizationIdAsync(query.OrganizationId, ct);
        return payments.Select(PaymentDto.FromEntity).ToList();
    }
}
