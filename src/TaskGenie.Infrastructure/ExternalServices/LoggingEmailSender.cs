using Microsoft.Extensions.Logging;
using TaskGenie.Application.Interfaces;

namespace TaskGenie.Infrastructure.ExternalServices;

/// <summary>Placeholder <see cref="IEmailSender"/> used until a real SMTP/provider adapter is
/// configured. Logs that a reset was requested for audit purposes only — it never logs the raw
/// token, so this is safe to run in any environment but does not actually deliver email. Swap in
/// a real provider-backed implementation before Production relies on password reset.</summary>
public class LoggingEmailSender(ILogger<LoggingEmailSender> logger) : IEmailSender
{
    public System.Threading.Tasks.Task SendPasswordResetEmailAsync(string toEmail, string resetToken, CancellationToken ct = default)
    {
        logger.LogInformation(
            "Password reset requested for {Email}. No email provider is configured; deliver the token through a real IEmailSender implementation before Production.",
            toEmail);
        return System.Threading.Tasks.Task.CompletedTask;
    }

    public System.Threading.Tasks.Task SendTeamInvitationEmailAsync(
        string toEmail,
        string teamName,
        string invitedByName,
        string respondUrl,
        CancellationToken ct = default)
    {
        logger.LogInformation(
            "Team invitation for {Email} to join {TeamName} (invited by {InvitedBy}). Respond at {RespondUrl}. "
            + "No email provider is configured; the in-app notification is the working channel until one is.",
            toEmail, teamName, invitedByName, respondUrl);
        return System.Threading.Tasks.Task.CompletedTask;
    }
}
