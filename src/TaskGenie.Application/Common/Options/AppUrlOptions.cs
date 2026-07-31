namespace TaskGenie.Application.Common.Options;

/// <summary>
/// Public base URL of this backend, used to build server-to-server callback URLs (e.g. MoMo's
/// ipnUrl) that gateways call directly and can't be derived from the incoming request.
/// </summary>
public class AppUrlOptions
{
    public const string SectionName = "AppUrls";

    public string BackendBaseUrl { get; set; } = string.Empty;
}
