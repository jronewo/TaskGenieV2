using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TaskGenie.Application.Common.Options;
using TaskGenie.Application.Interfaces;

namespace TaskGenie.Infrastructure.ExternalServices.PayOs;

/// <summary>
/// Real production gateway. Creates a PayOS hosted checkout link and returns its redirect URL;
/// everything downstream (settlement, entitlements, subscription state) still runs through
/// <see cref="IBillingService.SettlePaymentAsync"/>, driven by <see cref="PayOsWebhookController"/> —
/// this class never marks a payment as paid itself.
///
/// Registration is environment-gated in <c>DependencyInjection.AddInfrastructure</c>; startup fails
/// if PayOS is selected without credentials configured.
/// </summary>
public sealed class PayOsPaymentProvider(
    HttpClient httpClient,
    IOptions<PayOsOptions> options,
    IOptions<AppUrlSettings> appUrl,
    ILogger<PayOsPaymentProvider> logger) : IPaymentProvider
{
    public string Name => "PAYOS";

    public bool IsTestProvider => false;

    public async Task<CheckoutSession> CreateCheckoutSessionAsync(
        int paymentTransactionId, int amountMinor, string currency, CancellationToken ct = default)
    {
        if (amountMinor <= 0)
            throw new InvalidOperationException("PayOS checkout requires a positive VND amount.");

        if (!string.Equals(currency, "VND", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException(
                $"PayOS only settles in VND; plan currency was '{currency}'.");

        var opts = options.Value;
        var baseUrl = appUrl.Value.BaseUrl.TrimEnd('/');
        var returnUrl = $"{baseUrl}{opts.ReturnPath}&paymentId={paymentTransactionId}";
        var cancelUrl = $"{baseUrl}{opts.CancelPath}&paymentId={paymentTransactionId}&canceled=1";
        // PayOS caps description at 25 characters.
        var description = Truncate($"TaskGenie #{paymentTransactionId}", 25);

        var signature = PayOsSignature.Sign(
            new Dictionary<string, string>
            {
                ["amount"] = amountMinor.ToString(),
                ["cancelUrl"] = cancelUrl,
                ["description"] = description,
                ["orderCode"] = paymentTransactionId.ToString(),
                ["returnUrl"] = returnUrl,
            },
            opts.ChecksumKey);

        var request = new PayOsCreateRequest(
            paymentTransactionId, amountMinor, description, cancelUrl, returnUrl, signature);

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "/v2/payment-requests")
        {
            Content = JsonContent.Create(request),
        };
        httpRequest.Headers.Add("x-client-id", opts.ClientId);
        httpRequest.Headers.Add("x-api-key", opts.ApiKey);

        using var response = await httpClient.SendAsync(httpRequest, ct);
        var body = await response.Content.ReadFromJsonAsync<PayOsCreateResponse>(cancellationToken: ct);

        if (!response.IsSuccessStatusCode || body is null || body.Code != "00" || body.Data is null)
        {
            logger.LogError(
                "PayOS checkout creation failed for payment {PaymentId}: HTTP {StatusCode}, code {Code}, desc {Desc}",
                paymentTransactionId, (int)response.StatusCode, body?.Code, body?.Desc);
            throw new InvalidOperationException($"PayOS rejected the checkout request: {body?.Desc ?? response.ReasonPhrase}");
        }

        return new CheckoutSession(body.Data.PaymentLinkId, body.Data.CheckoutUrl, RequiresManualSimulation: false);
    }

    private static string Truncate(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..maxLength];

    private sealed record PayOsCreateRequest(
        [property: JsonPropertyName("orderCode")] int OrderCode,
        [property: JsonPropertyName("amount")] int Amount,
        [property: JsonPropertyName("description")] string Description,
        [property: JsonPropertyName("cancelUrl")] string CancelUrl,
        [property: JsonPropertyName("returnUrl")] string ReturnUrl,
        [property: JsonPropertyName("signature")] string Signature);

    private sealed record PayOsCreateResponse(
        [property: JsonPropertyName("code")] string? Code,
        [property: JsonPropertyName("desc")] string? Desc,
        [property: JsonPropertyName("data")] PayOsCreateResponseData? Data);

    private sealed record PayOsCreateResponseData(
        [property: JsonPropertyName("checkoutUrl")] string CheckoutUrl,
        [property: JsonPropertyName("paymentLinkId")] string PaymentLinkId,
        [property: JsonPropertyName("orderCode")] long OrderCode,
        [property: JsonPropertyName("status")] string Status);
}
