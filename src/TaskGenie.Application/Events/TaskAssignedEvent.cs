using MediatR;

namespace TaskGenie.Application.Events;

public sealed record TaskAssignedEvent(int TaskId, int AssignedUserId, string? TaskTitle) : INotification;
