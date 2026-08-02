namespace TaskGenie.Application.Interfaces;

public record CheckoutSession(string ProviderReference, string? RedirectUrl, bool RequiresManualSimulation);

/// <summary>Payment gateway boundary. The application service, database tables, state machine and
/// entitlement logic are identical for every implementation — only this adapter changes.</summary>
public interface IPaymentProvider
{
    /// <summary>Provider identifier persisted on the transaction ("FAKE", "STRIPE", …).</summary>
    string Name { get; }

    /// <summary>True when transactions belong to test data and must be excluded from production
    /// revenue reporting.</summary>
    bool IsTestProvider { get; }

    Task<CheckoutSession> CreateCheckoutSessionAsync(
        int paymentTransactionId, int amountMinor, string currency, CancellationToken ct = default);
}
