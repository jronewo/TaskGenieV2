using MediatR;

namespace TaskGenie.Application.Events;

public sealed record TaskCreatedEvent(int TaskId, int ProjectId, string? Title, int CreatedBy) : INotification;
