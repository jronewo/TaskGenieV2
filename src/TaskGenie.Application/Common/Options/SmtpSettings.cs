namespace TaskGenie.Application.Common.Options;

/// <summary>
/// Outbound mail. The password belongs in user-secrets or the environment, never in appsettings.
/// </summary>
public class SmtpSettings
{
    public const string SectionName = "Smtp";

    public string? Host { get; set; }

    public int Port { get; set; } = 587;

    /// <summary>STARTTLS. Off only for a local relay such as MailHog.</summary>
    public bool EnableSsl { get; set; } = true;

    public string? UserName { get; set; }

    public string? Password { get; set; }

    /// <summary>Envelope sender. Defaults to <see cref="UserName"/> when it is an address.</summary>
    public string? FromAddress { get; set; }

    public string FromName { get; set; } = "TaskGenie";

    /// <summary>Enough configuration to actually deliver a message.</summary>
    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(Host)
        && !string.IsNullOrWhiteSpace(FromAddress ?? UserName);

    public string ResolvedFromAddress => FromAddress ?? UserName ?? "no-reply@localhost";
}
