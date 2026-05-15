namespace TaskGenie.Domain.Events;

public sealed class TaskAssignedEvent : IDomainEvent
{
    public TaskAssignedEvent(int taskId, int assignedUserId)
    {
        TaskId = taskId;
        AssignedUserId = assignedUserId;
        OccurredOn = DateTime.UtcNow;
    }

    public int TaskId { get; }
    public int AssignedUserId { get; }
    public DateTime OccurredOn { get; }
}
