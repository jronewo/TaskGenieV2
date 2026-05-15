using System;
using System.Collections.Generic;

namespace TaskGenie.Domain.Entities;

public class ActivityLog
{
    protected ActivityLog() { }

    public int LogId { get; internal set; }

    public int? UserId { get; internal set; }

    public string? Action { get; internal set; }

    public string? EntityType { get; internal set; }

    public int? EntityId { get; internal set; }

    public DateTime? CreatedAt { get; internal set; }

    public static ActivityLog Create(int? userId, string action, string entityType, int entityId)
        => new() { UserId = userId, Action = action, EntityType = entityType, EntityId = entityId, CreatedAt = DateTime.UtcNow };
}
