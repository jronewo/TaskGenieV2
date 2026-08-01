using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Organizations;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Subscriptions.Commands;

public sealed record CancelSubscriptionCommand(int? OrganizationId) : IRequest<bool>;

public sealed class CancelSubscriptionCommandHandler(
    ICurrentUser currentUser,
    IOrganizationRepository organizationRepo,
    IOrganizationMemberRepository organizationMemberRepo,
    ISubscriptionEntitlementService entitlementService,
    ISubscriptionRepository subscriptionRepo
) : IRequestHandler<CancelSubscriptionCommand, bool>
{
    public async Task<bool> Handle(CancelSubscriptionCommand cmd, CancellationToken ct)
    {
        if (cmd.OrganizationId is int organizationId)
        {
            _ = await organizationRepo.GetByIdAsync(organizationId, ct)
                ?? throw new NotFoundException("Organization", organizationId);

            await OrganizationMembershipGuard.EnsureCanManageMembersAsync(currentUser, organizationMemberRepo, organizationId, ct);

            var orgSubscription = await entitlementService.GetActiveSubscriptionForOrganizationAsync(organizationId, ct)
                ?? throw new InvalidOperationException("This organization has no active subscription to cancel.");

            orgSubscription.Cancel();
            await subscriptionRepo.UpdateAsync(orgSubscription, ct);
            return true;
        }

        var subscription = await entitlementService.GetActiveSubscriptionForUserAsync(currentUser.UserId, ct)
            ?? throw new InvalidOperationException("You have no active subscription to cancel.");

        subscription.Cancel();
        await subscriptionRepo.UpdateAsync(subscription, ct);
        return true;
    }
}
