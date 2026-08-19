using TaskGenie.Application.Interfaces;

namespace TaskGenie.Infrastructure.ExternalServices;

/// <summary>Simulated gateway for Development/UAT. It performs no network call and settles nothing
/// on its own — a tester drives the outcome through the test-only simulate endpoint. Everything
/// downstream (transaction rows, subscription state machine, entitlements) is the real production
/// path, so the business flow is genuinely exercised.
///
/// Registration is environment-gated in <c>DependencyInjection.AddInfrastructure</c>; startup fails
/// if this type is ever resolved in Production.</summary>
public sealed class FakePaymentProvider : IPaymentProvider
{
    public string Name => "FAKE";

    public bool IsTestProvider => true;

    public Task<CheckoutSession> CreateCheckoutSessionAsync(
        int paymentTransactionId, int amountMinor, string currency, CancellationToken ct = default)
    {
        var reference = $"fake_{paymentTransactionId}_{Guid.NewGuid():N}";
        return Task.FromResult(new CheckoutSession(reference, RedirectUrl: null, RequiresManualSimulation: true));
    }
}
