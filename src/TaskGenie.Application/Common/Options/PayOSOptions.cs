namespace TaskGenie.Application.Common.Options;

public class PayOSOptions
{
    public const string SectionName = "PayOS";

    public string ClientId { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string ChecksumKey { get; set; } = string.Empty;

    /// <summary>Sandbox and production use the same host; the client id/key pair determines the mode.</summary>
    public string BaseUrl { get; set; } = "https://api-merchant.payos.vn";
}
