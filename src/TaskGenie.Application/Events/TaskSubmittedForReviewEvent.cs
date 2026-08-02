using MediatR;

namespace TaskGenie.Application.Events;

/// <summary>
/// Raised when a task enters InReview. Review is the one column where the work stalls unless a
/// specific person acts, so the leader has to be told rather than expected to notice the board.
/// </summary>
public sealed record TaskSubmittedForReviewEvent(int TaskId, int? ProjectId, string? Title) : INotification;
