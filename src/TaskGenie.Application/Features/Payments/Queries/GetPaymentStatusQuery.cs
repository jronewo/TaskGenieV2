using MediatR;
using TaskGenie.Application.Features.Payments.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Payments.Queries;

public sealed record GetPaymentStatusQuery(long OrderCode) : IRequest<PaymentDto?>;

public sealed class GetPaymentStatusQueryHandler(IPaymentRepository paymentRepo)
    : IRequestHandler<GetPaymentStatusQuery, PaymentDto?>
{
    public async Task<PaymentDto?> Handle(GetPaymentStatusQuery query, CancellationToken ct)
    {
        var payment = await paymentRepo.GetByOrderCodeAsync(query.OrderCode, ct);
        return payment is null ? null : PaymentDto.FromEntity(payment);
    }
}
