namespace TaskGenie.Application.Common.Options;

/// <summary>
/// PayOS merchant credentials and checkout redirect targets. The API key and checksum key belong in
/// user-secrets or the environment, never in appsettings.
/// </summary>
public class PayOsOptions
{
    public const string SectionName = "PayOS";

    public string ClientId { get; set; } = string.Empty;

    public string ApiKey { get; set; } = string.Empty;

    /// <summary>Used to HMAC-SHA256 sign checkout requests and verify webhook signatures.</summary>
    public string ChecksumKey { get; set; } = string.Empty;

    /// <summary>PayOS payment-requests API root.</summary>
    public string ApiBaseUrl { get; set; } = "https://api-merchant.payos.vn";

    /// <summary>Path under <see cref="AppUrlSettings.BaseUrl"/> the buyer lands on after paying.</summary>
    public string ReturnPath { get; set; } = "/?page=subscription";

    /// <summary>Path under <see cref="AppUrlSettings.BaseUrl"/> the buyer lands on after cancelling.</summary>
    public string CancelPath { get; set; } = "/?page=subscription";

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(ClientId)
        && !string.IsNullOrWhiteSpace(ApiKey)
        && !string.IsNullOrWhiteSpace(ChecksumKey);
}
