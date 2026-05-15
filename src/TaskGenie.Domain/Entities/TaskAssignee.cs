using System;
using System.Collections.Generic;

namespace TaskGenie.Domain.Entities;

public class TaskAssignee
{
    protected TaskAssignee() { }

    public int Id { get; internal set; }

    public int? TaskId { get; internal set; }

    public int? UserId { get; internal set; }

    public virtual Task? Task { get; internal set; }

    public virtual User? User { get; internal set; }

    public static TaskAssignee Create(int taskId, int userId) => new()
    {
        TaskId = taskId,
        UserId = userId
    };
}
