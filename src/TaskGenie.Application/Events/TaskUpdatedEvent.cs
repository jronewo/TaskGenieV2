using MediatR;

namespace TaskGenie.Application.Events;

public sealed record TaskUpdatedEvent(int TaskId, int ProjectId, string? Title) : INotification;
