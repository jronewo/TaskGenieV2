using System;

namespace TaskGenie.Domain.Entities;

public class Notification
{
    protected Notification() { }

    public int NotificationId { get; internal set; }

    public int? UserId { get; internal set; }

    public string? Type { get; internal set; }

    public string? Title { get; internal set; }

    public string? Message { get; internal set; }

    public int? ReferenceId { get; internal set; }

    public string? ReferenceType { get; internal set; }

    public bool IsRead { get; internal set; }

    public DateTime? CreatedAt { get; internal set; }

    public virtual User? User { get; internal set; }

    public static Notification Create(int userId, string type, string title, string? message, int? referenceId, string? referenceType)
        => new() { UserId = userId, Type = type, Title = title, Message = message, ReferenceId = referenceId, ReferenceType = referenceType, IsRead = false, CreatedAt = DateTime.UtcNow };

    public void MarkRead() => IsRead = true;
}
