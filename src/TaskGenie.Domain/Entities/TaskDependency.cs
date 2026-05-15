using System;

namespace TaskGenie.Domain.Entities;

public class TaskDependency
{
    protected TaskDependency() { }

    public int DependencyId { get; internal set; }

    public int TaskId { get; internal set; }

    public int DependsOnTaskId { get; internal set; }

    public virtual Task? Task { get; internal set; }

    public virtual Task? DependsOnTask { get; internal set; }

    public static TaskDependency Create(int taskId, int dependsOnTaskId) => new()
    {
        TaskId = taskId,
        DependsOnTaskId = dependsOnTaskId
    };
}
