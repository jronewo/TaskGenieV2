using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Subscriptions.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Application.Features.Subscriptions.Commands;

/// <summary>Simulates the payment gateway's checkout-confirmation callback. This is the only
/// place a subscription transitions from PendingPayment to Active — the client can request
/// simulated success/failure, but persistence of the resulting state always happens here,
/// server-side, never trusted from the client beyond the boolean the fake gateway "returned".</summary>
public sealed record ConfirmPaymentCommand(int PaymentTransactionId, bool Success) : IRequest<SubscriptionDto>;

public sealed class ConfirmPaymentCommandHandler(
    ICurrentUser currentUser,
    IPaymentTransactionRepository paymentRepo,
    ISubscriptionRepository subscriptionRepo,
    IOrganizationRepository organizationRepo
) : IRequestHandler<ConfirmPaymentCommand, SubscriptionDto>
{
    public async Task<SubscriptionDto> Handle(ConfirmPaymentCommand cmd, CancellationToken ct)
    {
        var payment = await paymentRepo.GetByIdAsync(cmd.PaymentTransactionId, ct)
            ?? throw new NotFoundException("PaymentTransaction", cmd.PaymentTransactionId);

        var subscription = payment.Subscription;

        await EnsureCanConfirmAsync(subscription, ct);

        if (payment.Status != PaymentTransactionStatus.Pending)
            throw new InvalidOperationException("This payment has already been confirmed.");

        if (cmd.Success)
        {
            payment.MarkSucceeded();
            subscription.Activate(subscription.Plan.BillingPeriodDays);
        }
        else
        {
            payment.MarkFailed();
            subscription.MarkFailed();
        }

        await paymentRepo.UpdateAsync(payment, ct);
        await subscriptionRepo.UpdateAsync(subscription, ct);

        var reloaded = await subscriptionRepo.GetByIdAsync(subscription.SubscriptionId, ct);
        return SubscriptionDto.FromEntity(reloaded!);
    }

    private async Task EnsureCanConfirmAsync(Subscription subscription, CancellationToken ct)
    {
        if (currentUser.IsPlatformAdmin) return;

        if (subscription.SubscriberUserId is int userId && userId == currentUser.UserId) return;

        if (subscription.SubscriberOrganizationId is int organizationId)
        {
            var org = await organizationRepo.GetByIdAsync(organizationId, ct);
            if (org?.OwnerId == currentUser.UserId) return;
        }

        throw new ForbiddenException("You do not have permission to confirm this payment.");
    }
}
