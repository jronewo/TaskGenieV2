using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Organizations;
using TaskGenie.Application.Features.Subscriptions.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Subscriptions.Queries;

/// <summary>Organization payment history is financial detail, so (unlike
/// GetMySubscriptionQuery's plan/quota summary) this stays OWNER/ADMIN-only.</summary>
public sealed record GetPaymentHistoryQuery(int? OrganizationId) : IRequest<List<PaymentTransactionDto>>;

public sealed class GetPaymentHistoryQueryHandler(
    ICurrentUser currentUser,
    IOrganizationRepository organizationRepo,
    IOrganizationMemberRepository organizationMemberRepo,
    IPaymentTransactionRepository paymentRepo
) : IRequestHandler<GetPaymentHistoryQuery, List<PaymentTransactionDto>>
{
    public async Task<List<PaymentTransactionDto>> Handle(GetPaymentHistoryQuery query, CancellationToken ct)
    {
        if (query.OrganizationId is int organizationId)
        {
            _ = await organizationRepo.GetByIdAsync(organizationId, ct)
                ?? throw new NotFoundException("Organization", organizationId);

            await OrganizationMembershipGuard.EnsureCanManageMembersAsync(currentUser, organizationMemberRepo, organizationId, ct);

            var orgPayments = await paymentRepo.GetForOrganizationAsync(organizationId, ct);
            return orgPayments.Select(PaymentTransactionDto.FromEntity).ToList();
        }

        var payments = await paymentRepo.GetForUserAsync(currentUser.UserId, ct);
        return payments.Select(PaymentTransactionDto.FromEntity).ToList();
    }
}
