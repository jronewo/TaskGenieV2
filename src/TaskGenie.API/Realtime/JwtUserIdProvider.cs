using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;

namespace TaskGenie.API.Realtime;

/// <summary>
/// Maps a connection to the user id in its JWT. SignalR's default uses the name claim, which is not
/// what the notification rows are keyed by.
/// </summary>
public sealed class JwtUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
        => connection.User?.FindFirstValue(ClaimTypes.NameIdentifier);
}
