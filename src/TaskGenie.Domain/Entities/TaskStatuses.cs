namespace TaskGenie.Domain.Entities;

/// <summary>
/// The workflow a task moves through. Work now goes Todo → InProgress → InReview → Done, so that
/// "finished" and "waiting to be checked" stop being the same column.
///
/// These were previously bare strings compared at half a dozen call sites with nothing validating
/// them, which meant a typo — or any client — could invent a status that no board column renders.
/// </summary>
public static class TaskStatuses
{
    public const string Todo = "Todo";
    public const string InProgress = "InProgress";
    public const string InReview = "InReview";
    public const string Done = "Done";

    public static readonly IReadOnlyList<string> All = [Todo, InProgress, InReview, Done];

    public static bool IsValid(string? status) =>
        status is not null && All.Contains(status, StringComparer.Ordinal);
}
