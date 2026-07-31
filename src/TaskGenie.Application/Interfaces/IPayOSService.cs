namespace TaskGenie.Application.Interfaces;

public record PayOSCreatePaymentLinkResult(string CheckoutUrl, string? QrCode, string PaymentLinkId);

public record PayOSWebhookData(
    long OrderCode,
    long Amount,
    string Description,
    string? Reference,
    string Code,
    string Desc);

public interface IPayOSService
{
    Task<PayOSCreatePaymentLinkResult> CreatePaymentLinkAsync(
        long orderCode,
        long amount,
        string description,
        string returnUrl,
        string cancelUrl,
        CancellationToken ct = default);

    /// <summary>
    /// Verifies the HMAC signature of an incoming payOS webhook body against the configured
    /// checksum key. Returns the parsed payment data on success, or null if the signature does
    /// not match — callers MUST treat a null result as "reject this request", never as "no data".
    /// </summary>
    PayOSWebhookData? VerifyAndParseWebhook(string rawJsonBody);
}
