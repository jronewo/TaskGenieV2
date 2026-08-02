using TaskGenie.Domain.Entities;

namespace TaskGenie.Application.Interfaces;

public record CheckoutResult(
    int PaymentTransactionId,
    int SubscriptionId,
    string Status,
    string ProviderReference,
    string? RedirectUrl,
    bool RequiresManualSimulation);

/// <summary>Owns the subscription/payment state machine. Shared verbatim by the fake and the real
/// payment provider — only <see cref="IPaymentProvider"/> differs between them.</summary>
public interface IBillingService
{
    /// <summary>Creates a PENDING payment for the plan. Passing an idempotency key that already
    /// exists returns the original transaction instead of creating a second one.</summary>
    Task<CheckoutResult> CreateCheckoutAsync(
        int planId, int? organizationId, string? idempotencyKey, CancellationToken ct = default);

    /// <summary>Settles a payment and moves the subscription/entitlements accordingly. Idempotent:
    /// settling an already-settled payment returns the existing state without duplicating anything.</summary>
    Task<PaymentTransaction> SettlePaymentAsync(int paymentTransactionId, string status, CancellationToken ct = default);

    Task<Subscription?> GetCurrentSubscriptionAsync(int? organizationId, CancellationToken ct = default);

    Task<Subscription> CancelSubscriptionAsync(int? organizationId, bool atPeriodEnd, CancellationToken ct = default);

    Task<List<PaymentTransaction>> GetPaymentHistoryAsync(int? organizationId, CancellationToken ct = default);
}
