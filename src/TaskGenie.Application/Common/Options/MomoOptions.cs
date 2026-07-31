namespace TaskGenie.Application.Common.Options;

public class MomoOptions
{
    public const string SectionName = "Momo";

    public string PartnerCode { get; set; } = string.Empty;
    public string AccessKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;

    /// <summary>Sandbox: https://test-payment.momo.vn/v2/gateway/api/create — Prod: https://payment.momo.vn/v2/gateway/api/create</summary>
    public string Endpoint { get; set; } = "https://test-payment.momo.vn/v2/gateway/api/create";
}
