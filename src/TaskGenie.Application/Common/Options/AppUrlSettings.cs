namespace TaskGenie.Application.Common.Options;

/// <summary>Where the web console lives, so emails can deep-link back into it.</summary>
public class AppUrlSettings
{
    public const string SectionName = "App";

    /// <summary>Base URL of the desktop web console, without a trailing slash.</summary>
    public string BaseUrl { get; set; } = "http://localhost:5173";

    /// <summary>Path the invitation email points at — the notification centre, where the invited
    /// person accepts or declines while signed in as themselves.</summary>
    public string NotificationsPath { get; set; } = "/?page=notifications";

    public string BuildNotificationsUrl()
        => $"{BaseUrl.TrimEnd('/')}{NotificationsPath}";
}
