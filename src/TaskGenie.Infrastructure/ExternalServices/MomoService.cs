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
/// MoMo "captureWallet" one-time payment flow via raw HttpClient. Field order in the raw
/// signature strings below is exactly as specified by MoMo — see
/// https://developers.momo.vn/v3/docs/payment/api/wallet/onetime and
/// https://developers.momo.vn/v3/docs/payment/api/other/signature/
/// </summary>
public class MomoService : IMomoService
{
    private readonly HttpClient _httpClient;
    private readonly MomoOptions _options;
    private readonly ILogger<MomoService> _logger;

    public MomoService(HttpClient httpClient, IOptions<MomoOptions> options, ILogger<MomoService> logger)
    {
        _options = options.Value;
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<string> CreatePaymentUrlAsync(
        string orderId,
        long amount,
        string orderInfo,
        string returnUrl,
        string ipnUrl,
        string extraData = "",
        CancellationToken ct = default)
    {
        var requestId = Guid.NewGuid().ToString("N");
        const string requestType = "captureWallet";

        var rawSignature =
            $"accessKey={_options.AccessKey}" +
            $"&amount={amount}" +
            $"&extraData={extraData}" +
            $"&ipnUrl={ipnUrl}" +
            $"&orderId={orderId}" +
            $"&orderInfo={orderInfo}" +
            $"&partnerCode={_options.PartnerCode}" +
            $"&redirectUrl={returnUrl}" +
            $"&requestId={requestId}" +
            $"&requestType={requestType}";

        var signature = ComputeHmacSha256(rawSignature, _options.SecretKey);

        var payload = new
        {
            partnerCode = _options.PartnerCode,
            partnerName = "TaskGenie",
            requestId,
            amount,
            orderId,
            orderInfo,
            redirectUrl = returnUrl,
            ipnUrl,
            lang = "vi",
            extraData,
            requestType,
            signature
        };

        using var response = await _httpClient.PostAsJsonAsync(_options.Endpoint, payload, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("MoMo createOrder failed ({Status}): {Body}", response.StatusCode, body);
            throw new InvalidOperationException($"MoMo create-payment failed: {response.StatusCode}");
        }

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        var resultCode = root.GetProperty("resultCode").GetInt32();
        if (resultCode != 0)
        {
            var message = root.TryGetProperty("message", out var m) ? m.GetString() : null;
            _logger.LogError("MoMo createOrder returned resultCode {Code}: {Message}", resultCode, message);
            throw new InvalidOperationException($"MoMo create-payment error {resultCode}: {message}");
        }

        return root.GetProperty("payUrl").GetString()!;
    }

    public bool VerifyIpnSignature(MomoIpnPayload payload)
    {
        var rawSignature =
            $"accessKey={_options.AccessKey}" +
            $"&amount={payload.Amount}" +
            $"&extraData={payload.ExtraData}" +
            $"&message={payload.Message}" +
            $"&orderId={payload.OrderId}" +
            $"&orderInfo={payload.OrderInfo}" +
            $"&orderType={payload.OrderType}" +
            $"&partnerCode={payload.PartnerCode}" +
            $"&payType={payload.PayType}" +
            $"&requestId={payload.RequestId}" +
            $"&responseTime={payload.ResponseTime}" +
            $"&resultCode={payload.ResultCode}" +
            $"&transId={payload.TransId}";

        var expectedSignature = ComputeHmacSha256(rawSignature, _options.SecretKey);
        var isValid = string.Equals(expectedSignature, payload.Signature, StringComparison.OrdinalIgnoreCase);

        if (!isValid)
            _logger.LogWarning("MoMo IPN signature mismatch for orderId {OrderId} — rejecting.", payload.OrderId);

        return isValid;
    }

    private static string ComputeHmacSha256(string data, string key)
    {
        var keyBytes = Encoding.UTF8.GetBytes(key);
        var dataBytes = Encoding.UTF8.GetBytes(data);
        var hash = HMACSHA256.HashData(keyBytes, dataBytes);
        return Convert.ToHexStringLower(hash);
    }
}
