using MediatR;

namespace TaskGenie.Application.Events;

public sealed record TaskCompletedEvent(int TaskId, int? ProjectId, string? Title) : INotification;
