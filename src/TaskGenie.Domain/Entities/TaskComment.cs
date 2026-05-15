using System;
using System.Collections.Generic;

namespace TaskGenie.Domain.Entities;

public class TaskComment
{
    protected TaskComment() { }

    public int CommentId { get; internal set; }

    public int? TaskId { get; internal set; }

    public int? UserId { get; internal set; }

    public string? Content { get; internal set; }

    public string? ImageUrl { get; internal set; }

    public DateTime? CreatedAt { get; internal set; }

    public virtual Task? Task { get; internal set; }

    public virtual User? User { get; internal set; }

    public static TaskComment Create(int taskId, int userId, string? content, string? imageUrl)
        => new() { TaskId = taskId, UserId = userId, Content = content, ImageUrl = imageUrl, CreatedAt = DateTime.UtcNow };
}
