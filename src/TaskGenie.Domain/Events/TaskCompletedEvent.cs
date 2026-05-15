namespace TaskGenie.Domain.Events;

public sealed class TaskCompletedEvent : IDomainEvent
{
    public TaskCompletedEvent(int taskId, int? projectId)
    {
        TaskId = taskId;
        ProjectId = projectId;
        OccurredOn = DateTime.UtcNow;
    }

    public int TaskId { get; }
    public int? ProjectId { get; }
    public DateTime OccurredOn { get; }
}
