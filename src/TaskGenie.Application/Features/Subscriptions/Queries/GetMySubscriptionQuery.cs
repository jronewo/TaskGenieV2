using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Subscriptions.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Subscriptions.Queries;

/// <summary>OrganizationId null = the current user's personal subscription. Otherwise the
/// given organization's subscription — visible to any member of that organization (not just
/// OWNER/ADMIN), same read-access rule as GetOrganizationMembersQuery.</summary>
public sealed record GetMySubscriptionQuery(int? OrganizationId) : IRequest<SubscriptionSummaryDto>;

public sealed class GetMySubscriptionQueryHandler(
    ICurrentUser currentUser,
    IOrganizationRepository organizationRepo,
    IOrganizationMemberRepository organizationMemberRepo,
    ISubscriptionEntitlementService entitlementService
) : IRequestHandler<GetMySubscriptionQuery, SubscriptionSummaryDto>
{
    public async Task<SubscriptionSummaryDto> Handle(GetMySubscriptionQuery query, CancellationToken ct)
    {
        if (query.OrganizationId is int organizationId)
        {
            _ = await organizationRepo.GetByIdAsync(organizationId, ct)
                ?? throw new NotFoundException("Organization", organizationId);

            if (!currentUser.IsPlatformAdmin)
            {
                var membership = await organizationMemberRepo.GetMembershipAsync(organizationId, currentUser.UserId, ct);
                if (membership is null)
                    throw new ForbiddenException("You do not have permission to view this organization's subscription.");
            }

            var orgSubscription = await entitlementService.GetActiveSubscriptionForOrganizationAsync(organizationId, ct);
            var orgEntitlement = await entitlementService.GetOrganizationEntitlementAsync(organizationId, ct);

            return new SubscriptionSummaryDto
            {
                ActiveSubscription = orgSubscription is null ? null : SubscriptionDto.FromEntity(orgSubscription),
                Entitlement = orgEntitlement
            };
        }

        var subscription = await entitlementService.GetActiveSubscriptionForUserAsync(currentUser.UserId, ct);
        var entitlement = await entitlementService.GetPersonalEntitlementAsync(currentUser.UserId, ct);

        return new SubscriptionSummaryDto
        {
            ActiveSubscription = subscription is null ? null : SubscriptionDto.FromEntity(subscription),
            Entitlement = entitlement
        };
    }
}
