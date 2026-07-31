using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TaskGenie.Application.Common.Options;
using TaskGenie.Application.Interfaces;

namespace TaskGenie.Infrastructure.ExternalServices;

/// <summary>
/// Talks to payOS's REST API directly (https://api-merchant.payos.vn) instead of the official SDK,
/// to keep this service consistent with the other HttpClient-based ExternalServices in this project
/// and avoid pinning to a third-party SDK's surface. See payOS docs:
/// https://payos.vn/docs/api/ and https://payos.vn/docs/tich-hop-webhook/kiem-tra-du-lieu-voi-signature/
/// </summary>
public class PayOSService : IPayOSService
{
    private readonly HttpClient _httpClient;
    private readonly PayOSOptions _options;
    private readonly ILogger<PayOSService> _logger;

    public PayOSService(HttpClient httpClient, IOptions<PayOSOptions> options, ILogger<PayOSService> logger)
    {
        _options = options.Value;
        _httpClient = httpClient;
        _httpClient.BaseAddress = new Uri(_options.BaseUrl);
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        _logger = logger;
    }

    public async Task<PayOSCreatePaymentLinkResult> CreatePaymentLinkAsync(
        long orderCode,
        long amount,
        string description,
        string returnUrl,
        string cancelUrl,
        CancellationToken ct = default)
    {
        // payOS requires the create-payment-link signature to be computed over exactly these five
        // fields, sorted alphabetically by key — this order is part of their spec, not incidental.
        var signatureData = $"amount={amount}&cancelUrl={cancelUrl}&description={description}&orderCode={orderCode}&returnUrl={returnUrl}";
        var signature = ComputeHmacSha256(signatureData, _options.ChecksumKey);

        var payload = new Dictionary<string, object?>
        {
            ["orderCode"] = orderCode,
            ["amount"] = amount,
            ["description"] = description,
            ["returnUrl"] = returnUrl,
            ["cancelUrl"] = cancelUrl,
            ["signature"] = signature
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, "/v2/payment-requests")
        {
            Content = JsonContent.Create(payload)
        };
        request.Headers.Add("x-client-id", _options.ClientId);
        request.Headers.Add("x-api-key", _options.ApiKey);

        using var response = await _httpClient.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("payOS CreatePaymentLink failed ({Status}): {Body}", response.StatusCode, body);
            throw new InvalidOperationException($"payOS create-payment-link failed: {response.StatusCode}");
        }

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        var code = root.GetProperty("code").GetString();
        if (code != "00")
        {
            var desc = root.TryGetProperty("desc", out var descEl) ? descEl.GetString() : null;
            _logger.LogError("payOS CreatePaymentLink returned error code {Code}: {Desc}", code, desc);
            throw new InvalidOperationException($"payOS create-payment-link error {code}: {desc}");
        }

        var data = root.GetProperty("data");
        return new PayOSCreatePaymentLinkResult(
            CheckoutUrl: data.GetProperty("checkoutUrl").GetString()!,
            QrCode: data.TryGetProperty("qrCode", out var qr) ? qr.GetString() : null,
            PaymentLinkId: data.GetProperty("paymentLinkId").GetString()!);
    }

    public PayOSWebhookData? VerifyAndParseWebhook(string rawJsonBody)
    {
        using var doc = JsonDocument.Parse(rawJsonBody);
        var root = doc.RootElement;

        if (!root.TryGetProperty("data", out var data) || !root.TryGetProperty("signature", out var signatureEl))
            return null;

        var expectedSignature = ComputeHmacSha256(BuildSortedQueryString(data), _options.ChecksumKey);
        var actualSignature = signatureEl.GetString();

        if (!string.Equals(expectedSignature, actualSignature, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("payOS webhook signature mismatch — rejecting.");
            return null;
        }

        return new PayOSWebhookData(
            OrderCode: data.GetProperty("orderCode").GetInt64(),
            Amount: data.GetProperty("amount").GetInt64(),
            Description: data.TryGetProperty("description", out var d) ? d.GetString() ?? "" : "",
            Reference: data.TryGetProperty("reference", out var r) ? r.GetString() : null,
            Code: data.TryGetProperty("code", out var c) ? c.GetString() ?? "" : "",
            Desc: data.TryGetProperty("desc", out var desc2) ? desc2.GetString() ?? "" : "");
    }

    /// <summary>
    /// Sorts the webhook's `data` object fields alphabetically by key and joins them as
    /// key1=value1&amp;key2=value2..., per payOS's webhook signature spec. Null values become
    /// empty strings; objects/arrays are re-serialized as JSON.
    /// </summary>
    private static string BuildSortedQueryString(JsonElement data)
    {
        var pairs = data.EnumerateObject()
            .OrderBy(p => p.Name, StringComparer.Ordinal)
            .Select(p => $"{p.Name}={StringifyJsonValue(p.Value)}");
        return string.Join("&", pairs);
    }

    private static string StringifyJsonValue(JsonElement value) => value.ValueKind switch
    {
        JsonValueKind.Null or JsonValueKind.Undefined => "",
        JsonValueKind.String => value.GetString() ?? "",
        JsonValueKind.Object or JsonValueKind.Array => value.GetRawText(),
        _ => value.GetRawText()
    };

    private static string ComputeHmacSha256(string data, string key)
    {
        var keyBytes = Encoding.UTF8.GetBytes(key);
        var dataBytes = Encoding.UTF8.GetBytes(data);
        var hash = HMACSHA256.HashData(keyBytes, dataBytes);
        return Convert.ToHexStringLower(hash);
    }
}
