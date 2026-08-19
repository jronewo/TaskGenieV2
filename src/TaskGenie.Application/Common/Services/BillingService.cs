using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Application.Common.Services;

public sealed class BillingService(
    ICurrentUser currentUser,
    IResourceAuthorizationService authorization,
    IPaymentProvider paymentProvider,
    IPlanRepository planRepo,
    ISubscriptionRepository subscriptionRepo,
    IPaymentTransactionRepository paymentRepo) : IBillingService
{
    public async Task<CheckoutResult> CreateCheckoutAsync(
        int planId, int? organizationId, string? idempotencyKey, CancellationToken ct = default)
    {
        // Buying for an organization is an owner/admin action; buying for yourself is always allowed.
        if (organizationId is int orgId)
            await authorization.EnsureCanManageOrganizationAsync(orgId, ct);

        var plan = await planRepo.GetByIdAsync(planId, ct)
            ?? throw new NotFoundException("Plan", planId);

        if (!plan.IsActive)
            throw new InvalidOperationException("This plan is no longer available for purchase.");

        var expectedAudience = organizationId is null ? PlanAudiences.Personal : PlanAudiences.Organization;
        if (plan.Audience != expectedAudience)
            throw new InvalidOperationException($"This plan cannot be purchased for a {expectedAudience.ToLowerInvariant()} account.");

        var key = string.IsNullOrWhiteSpace(idempotencyKey)
            ? $"auto_{currentUser.UserId}_{organizationId?.ToString() ?? "personal"}_{planId}_{Guid.NewGuid():N}"
            : idempotencyKey;

        // Replaying the same key must never create a second payment.
        var existing = await paymentRepo.GetByIdempotencyKeyAsync(key, ct);
        if (existing is not null)
        {
            return new CheckoutResult(
                existing.PaymentTransactionId, existing.SubscriptionId, existing.Status,
                existing.ProviderReference ?? string.Empty, null,
                paymentProvider.IsTestProvider && existing.Status == PaymentStatuses.Pending);
        }

        var subscription = organizationId is int subOrgId
            ? Subscription.CreateForOrganization(plan.PlanId, subOrgId)
            : Subscription.CreateForUser(plan.PlanId, currentUser.UserId);
        await subscriptionRepo.AddAsync(subscription, ct);

        var payment = PaymentTransaction.Create(
            subscription.SubscriptionId, plan.PlanId,
            organizationId is null ? currentUser.UserId : null,
            organizationId,
            plan.PriceMinor, plan.Currency, key,
            paymentProvider.Name, paymentProvider.IsTestProvider);
        await paymentRepo.AddAsync(payment, ct);

        var session = await paymentProvider.CreateCheckoutSessionAsync(
            payment.PaymentTransactionId, plan.PriceMinor, plan.Currency, ct);

        payment.Settle(PaymentStatuses.Pending, session.ProviderReference);
        // Settle() stamps CompletedAt; a pending payment has not completed.
        payment.ClearCompletion();
        await paymentRepo.UpdateAsync(payment, ct);

        return new CheckoutResult(
            payment.PaymentTransactionId, subscription.SubscriptionId, payment.Status,
            session.ProviderReference, session.RedirectUrl, session.RequiresManualSimulation);
    }

    public async Task<PaymentTransaction> SettlePaymentAsync(int paymentTransactionId, string status, CancellationToken ct = default)
    {
        var payment = await paymentRepo.GetByIdAsync(paymentTransactionId, ct)
            ?? throw new NotFoundException("PaymentTransaction", paymentTransactionId);

        await EnsureCallerOwnsPaymentAsync(payment, ct);

        // Idempotent: a duplicate settle for the same target status is a no-op, so a replayed
        // callback cannot grant a second subscription period.
        if (payment.Status == status) return payment;
        if (payment.IsSettled && status != PaymentStatuses.Refunded)
            throw new InvalidOperationException($"Payment is already {payment.Status} and cannot become {status}.");

        var subscription = await subscriptionRepo.GetByIdAsync(payment.SubscriptionId, ct)
            ?? throw new NotFoundException("Subscription", payment.SubscriptionId);

        payment.Settle(status);
        await paymentRepo.UpdateAsync(payment, ct);

        switch (status)
        {
            case PaymentStatuses.Succeeded:
                subscription.Activate(NextPeriodEnd(subscription.Plan));
                break;

            case PaymentStatuses.Refunded:
            case PaymentStatuses.Expired:
                subscription.Expire();
                break;

            case PaymentStatuses.Canceled:
                subscription.MarkCanceled();
                break;

            // FAILED leaves the subscription PENDING — no entitlement is granted.
        }

        await subscriptionRepo.UpdateAsync(subscription, ct);
        return payment;
    }

    public async Task<Subscription?> GetCurrentSubscriptionAsync(int? organizationId, CancellationToken ct = default)
    {
        if (organizationId is int orgId)
        {
            await authorization.EnsureCanAccessOrganizationAsync(orgId, ct);
            return await subscriptionRepo.GetEffectiveForOrganizationAsync(orgId, ct);
        }

        return await subscriptionRepo.GetEffectiveForUserAsync(currentUser.UserId, ct);
    }

    public async Task<Subscription> CancelSubscriptionAsync(int? organizationId, bool atPeriodEnd, CancellationToken ct = default)
    {
        if (organizationId is int orgId)
            await authorization.EnsureCanManageOrganizationAsync(orgId, ct);

        var subscription = organizationId is int cancelOrgId
            ? await subscriptionRepo.GetEffectiveForOrganizationAsync(cancelOrgId, ct)
            : await subscriptionRepo.GetEffectiveForUserAsync(currentUser.UserId, ct);

        if (subscription is null)
            throw new NotFoundException("Subscription", organizationId?.ToString() ?? "personal");

        subscription.Cancel(atPeriodEnd);
        await subscriptionRepo.UpdateAsync(subscription, ct);
        return subscription;
    }

    public async Task<List<PaymentTransaction>> GetPaymentHistoryAsync(int? organizationId, CancellationToken ct = default)
    {
        if (organizationId is int orgId)
        {
            await authorization.EnsureCanManageOrganizationAsync(orgId, ct);
            return await paymentRepo.GetForOrganizationAsync(orgId, ct);
        }

        return await paymentRepo.GetForUserAsync(currentUser.UserId, ct);
    }

    private async Task EnsureCallerOwnsPaymentAsync(PaymentTransaction payment, CancellationToken ct)
    {
        // A gateway webhook has no JWT at all — it is authenticated by its own signature/secret
        // check before SettlePaymentAsync is ever reached, not by owning the payment as a user.
        if (!currentUser.IsAuthenticated) return;
        if (currentUser.IsPlatformAdmin) return;

        if (payment.OrganizationId is int orgId)
        {
            await authorization.EnsureCanManageOrganizationAsync(orgId, ct);
            return;
        }

        if (payment.UserId != currentUser.UserId)
            throw new ForbiddenException("You do not have access to this payment.");
    }

    private static DateTime NextPeriodEnd(Plan? plan) => plan?.BillingInterval switch
    {
        PlanBillingIntervals.Yearly => DateTime.UtcNow.AddYears(1),
        PlanBillingIntervals.Monthly => DateTime.UtcNow.AddMonths(1),
        _ => DateTime.UtcNow.AddYears(100) // free/no-interval plans do not lapse
    };
}
