namespace TaskGenie.Application.Interfaces;

/// <summary>Delivers transactional emails. The registered implementation must never log or
/// otherwise persist the raw secret it is asked to deliver.</summary>
public interface IEmailSender
{
    System.Threading.Tasks.Task SendPasswordResetEmailAsync(string toEmail, string resetToken, CancellationToken ct = default);

    /// <summary>
    /// Invites someone onto a team. <paramref name="respondUrl"/> deep-links into the app's
    /// notification centre, where the invitation is accepted or declined — the decision is never
    /// taken from the link itself, so a forwarded email cannot accept on someone else's behalf.
    /// </summary>
    System.Threading.Tasks.Task SendTeamInvitationEmailAsync(
        string toEmail,
        string teamName,
        string invitedByName,
        string respondUrl,
        CancellationToken ct = default);

    /// <summary>
    /// Warns that a subscription is about to lapse, or tells the owner it already has.
    /// <paramref name="daysRemaining"/> is 0 once the period has ended, which is what selects the
    /// "already expired" wording — the two cases share one method so they cannot drift apart.
    /// </summary>
    System.Threading.Tasks.Task SendSubscriptionExpiryEmailAsync(
        string toEmail,
        string planName,
        int daysRemaining,
        DateTime periodEnd,
        string manageUrl,
        CancellationToken ct = default);
}
