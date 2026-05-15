namespace TaskGenie.Domain.Events;

public sealed class TaskCreatedEvent : IDomainEvent
{
    public TaskCreatedEvent(int taskId, int? projectId, int? createdBy)
    {
        TaskId = taskId;
        ProjectId = projectId;
        CreatedBy = createdBy;
        OccurredOn = DateTime.UtcNow;
    }

    public int TaskId { get; }
    public int? ProjectId { get; }
    public int? CreatedBy { get; }
    public DateTime OccurredOn { get; }
}
