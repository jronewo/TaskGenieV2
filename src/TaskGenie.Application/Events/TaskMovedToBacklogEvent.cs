using MediatR;

namespace TaskGenie.Application.Events;

/// <summary>
/// Raised when a task moves into Backlog. Unlike a routine status change, this always carries a
/// reason (a bug) and the task keeps its assignee, so the person already holding it needs to be
/// told why their work bounced back rather than expected to notice the board.
/// </summary>
public sealed record TaskMovedToBacklogEvent(int TaskId, int? ProjectId, string? Title, string? Reason) : INotification;
