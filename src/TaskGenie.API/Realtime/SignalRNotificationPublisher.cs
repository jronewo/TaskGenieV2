using Microsoft.AspNetCore.SignalR;
using TaskGenie.Application.Interfaces;

namespace TaskGenie.API.Realtime;

/// <summary>
/// Delivers a stored notification to its owner's open connections.
/// Failure is swallowed deliberately: the row is already committed, and the client refetches on
/// load, so a dropped push must never turn into a failed request for the user who triggered it.
/// </summary>
public sealed class SignalRNotificationPublisher(
    IHubContext<NotificationHub> hub,
    ILogger<SignalRNotificationPublisher> logger
) : IRealtimeNotifier
{
    public async System.Threading.Tasks.Task PublishAsync(NotificationPayload payload, CancellationToken ct = default)
    {
        try
        {
            logger.LogInformation("Pushing notification {NotificationId} to user {UserId}.",
                payload.NotificationId, payload.UserId);

            await hub.Clients
                .User(payload.UserId.ToString())
                .SendAsync("notification", payload, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not push notification {NotificationId} to user {UserId}.",
                payload.NotificationId, payload.UserId);
        }
    }
}
