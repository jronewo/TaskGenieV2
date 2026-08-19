namespace TaskGenie.Application.Interfaces;

/// <summary>What a freshly stored notification looks like on the wire.</summary>
public sealed record NotificationPayload(
    int NotificationId,
    int UserId,
    string Type,
    string Title,
    string? Message,
    int? ReferenceId,
    string? ReferenceType,
    DateTime CreatedAt);

/// <summary>
/// Pushes a notification to whoever it belongs to, live. Kept as an interface here so the
/// Application layer never references the transport — SignalR lives in the API project.
/// The database row is the source of truth; a failed push is a missed nudge, not lost data.
/// </summary>
public interface IRealtimeNotifier
{
    System.Threading.Tasks.Task PublishAsync(NotificationPayload payload, CancellationToken ct = default);
}
