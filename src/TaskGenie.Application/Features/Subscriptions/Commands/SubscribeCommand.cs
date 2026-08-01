using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Organizations;
using TaskGenie.Application.Features.Subscriptions.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Subscriptions.Commands;

/// <summary>Starts a (simulated) checkout: creates a pending Subscription + a pending
/// PaymentTransaction. The subscription only becomes Active once ConfirmPaymentCommand is
/// called with success=true — mirroring a real gateway's checkout/webhook-confirm split.
/// OrganizationId null = personal subscription for the current user.</summary>
public sealed record SubscribeCommand(int PlanId, int? OrganizationId) : IRequest<SubscribeResult>;

public sealed record SubscribeResult(SubscriptionDto Subscription, PaymentTransactionDto Payment);

public sealed class SubscribeCommandHandler(
    ICurrentUser currentUser,
    IOrganizationRepository organizationRepo,
    IOrganizationMemberRepository organizationMemberRepo,
    IPlanRepository planRepo,
    ISubscriptionRepository subscriptionRepo,
    IPaymentTransactionRepository paymentRepo
) : IRequestHandler<SubscribeCommand, SubscribeResult>
{
    public async Task<SubscribeResult> Handle(SubscribeCommand cmd, CancellationToken ct)
    {
        var plan = await planRepo.GetByIdAsync(cmd.PlanId, ct)
            ?? throw new NotFoundException("Plan", cmd.PlanId);

        if (!plan.IsActive)
            throw new InvalidOperationException("This plan is no longer available.");

        Subscription subscription;

        if (cmd.OrganizationId is int organizationId)
        {
            _ = await organizationRepo.GetByIdAsync(organizationId, ct)
                ?? throw new NotFoundException("Organization", organizationId);

            // OWNER/ADMIN of the organization (or a platform admin) may subscribe on its
            // behalf — consistent with CreateProjectCommand's org-level authorization.
            await OrganizationMembershipGuard.EnsureCanManageMembersAsync(currentUser, organizationMemberRepo, organizationId, ct);

            if (plan.Scope != "Organization")
                throw new InvalidOperationException("This plan is not available for organizations.");

            subscription = Subscription.CreatePendingForOrganization(organizationId, plan.PlanId);
        }
        else
        {
            if (plan.Scope != "Personal")
                throw new InvalidOperationException("This plan is not available for personal accounts.");

            subscription = Subscription.CreatePendingForUser(currentUser.UserId, plan.PlanId);
        }

        await subscriptionRepo.AddAsync(subscription, ct);

        // Free plans (price 0) require no payment confirmation step — activate immediately.
        if (plan.PriceCents == 0)
        {
            subscription.Activate(plan.BillingPeriodDays);
            await subscriptionRepo.UpdateAsync(subscription, ct);
        }

        var gatewayReference = $"SIM-{Guid.NewGuid():N}";
        var payment = PaymentTransaction.CreatePending(subscription.SubscriptionId, plan.PriceCents, plan.Currency, gatewayReference);

        if (plan.PriceCents == 0)
            payment.MarkSucceeded();

        await paymentRepo.AddAsync(payment, ct);

        var reloadedSubscription = await subscriptionRepo.GetByIdAsync(subscription.SubscriptionId, ct);
        var paymentDto = new PaymentTransactionDto
        {
            PaymentTransactionId = payment.PaymentTransactionId,
            SubscriptionId = payment.SubscriptionId,
            AmountCents = payment.AmountCents,
            Currency = payment.Currency,
            GatewayReference = payment.GatewayReference,
            Status = payment.Status,
            CreatedAt = payment.CreatedAt,
            ConfirmedAt = payment.ConfirmedAt,
            PlanCode = plan.Code,
            PlanName = plan.Name
        };

        return new SubscribeResult(SubscriptionDto.FromEntity(reloadedSubscription!), paymentDto);
    }
}
