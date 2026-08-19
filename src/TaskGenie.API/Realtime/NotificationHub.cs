using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace TaskGenie.API.Realtime;

/// <summary>
/// Live notification channel. Authorisation is the same JWT the REST API uses, and clients are
/// addressed by user id — a connection can only ever receive its own owner's notifications, so
/// there is nothing here for a client to subscribe itself into.
/// </summary>
[Authorize]
public sealed class NotificationHub(ILogger<NotificationHub> logger) : Hub
{
    public override System.Threading.Tasks.Task OnConnectedAsync()
    {
        logger.LogInformation("Notification hub connected: userIdentifier={UserIdentifier}, connection={ConnectionId}",
            Context.UserIdentifier ?? "(null)", Context.ConnectionId);
        return base.OnConnectedAsync();
    }
}
