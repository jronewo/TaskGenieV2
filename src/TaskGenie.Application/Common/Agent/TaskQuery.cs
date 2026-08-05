using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Application.Common.Agent;

/// <summary>Fields a query may filter or sort by. Nothing outside this list is reachable.</summary>
public enum TaskField
{
    Status,
    Priority,
    RiskLevel,
    Difficulty,
    Deadline,
    Progress,
    CreatedAt,
    CompletedAt,
    AssigneeCount,
    TaskTypeName,
}

public enum Comparison
{
    Equals,
    NotEquals,
    GreaterThan,
    LessThan,
    GreaterOrEqual,
    LessOrEqual,
    Contains,
    IsNull,
    IsNotNull,
}

/// <summary>
/// One condition: a field, how to compare it, and against what. <paramref name="Value"/> is always
/// plain text — parsed against the field's real type, never interpolated into anything executable.
/// </summary>
public sealed record TaskFilter(TaskField Field, Comparison Comparison, string? Value);

/// <summary>
/// A question about tasks, expressed as filters over a fixed set of fields rather than as code.
///
/// This is what the model is allowed to produce when answering a free-form question: which of
/// <see cref="TaskField"/> to filter or sort by, never a query string, a method name, or anything
/// else that would need to be trusted rather than validated. <see cref="Apply"/> is the only place
/// a TaskQuery ever touches data, and it runs entirely in memory over rows the caller already had
/// permission to read — the model chooses filters, never scope.
/// </summary>
public sealed record TaskQuery(
    IReadOnlyList<TaskFilter> Filters,
    TaskField? SortBy,
    bool SortDescending,
    int Limit)
{
    /// <summary>A chat bubble listing hundreds of rows helps nobody; the model is told this cap.</summary>
    public const int MaxLimit = 20;

    public static TaskQuery Empty { get; } = new([], null, false, MaxLimit);

    public IReadOnlyList<TaskEntity> Apply(IReadOnlyList<TaskEntity> tasks, DateOnly today)
    {
        var query = tasks.AsEnumerable();

        foreach (var filter in Filters)
        {
            query = query.Where(task => Matches(task, filter, today));
        }

        if (SortBy is TaskField sortField)
        {
            query = SortDescending
                ? query.OrderByDescending(task => SortKey(task, sortField, today))
                : query.OrderBy(task => SortKey(task, sortField, today));
        }

        return query.Take(Math.Clamp(Limit, 1, MaxLimit)).ToList();
    }

    private static bool Matches(TaskEntity task, TaskFilter filter, DateOnly today)
    {
        object? actual = filter.Field switch
        {
            TaskField.Status => task.Status,
            TaskField.Priority => task.Priority,
            TaskField.RiskLevel => task.RiskLevel,
            TaskField.Difficulty => task.Difficulty,
            TaskField.Deadline => task.Deadline is DateOnly d ? d.DayNumber - today.DayNumber : (int?)null,
            TaskField.Progress => task.Progress,
            TaskField.CreatedAt => task.CreatedAt,
            TaskField.CompletedAt => task.CompletedAt,
            TaskField.AssigneeCount => task.TaskAssignees?.Count ?? 0,
            TaskField.TaskTypeName => task.TaskType?.Name,
            _ => null,
        };

        if (filter.Comparison is Comparison.IsNull) return actual is null;
        if (filter.Comparison is Comparison.IsNotNull) return actual is not null;
        if (actual is null) return false;

        return filter.Comparison switch
        {
            Comparison.Contains => actual is string s
                && filter.Value is not null
                && s.Contains(filter.Value, StringComparison.OrdinalIgnoreCase),

            Comparison.Equals when actual is string text =>
                string.Equals(text, filter.Value, StringComparison.OrdinalIgnoreCase),
            Comparison.NotEquals when actual is string text =>
                !string.Equals(text, filter.Value, StringComparison.OrdinalIgnoreCase),

            _ when TryCompareNumeric(actual, filter.Value, out var order) => filter.Comparison switch
            {
                Comparison.Equals => order == 0,
                Comparison.NotEquals => order != 0,
                Comparison.GreaterThan => order > 0,
                Comparison.LessThan => order < 0,
                Comparison.GreaterOrEqual => order >= 0,
                Comparison.LessOrEqual => order <= 0,
                _ => false,
            },

            _ => false,
        };
    }

    /// <summary>
    /// Compares a field's actual value against the model's text value once both are numbers or
    /// dates. Kept as a single conversion point so a value that will not parse simply fails the
    /// filter instead of throwing partway through a scan.
    /// </summary>
    private static bool TryCompareNumeric(object actual, string? value, out int order)
    {
        order = 0;
        if (value is null) return false;

        switch (actual)
        {
            case int i when int.TryParse(value, out var iv):
                order = i.CompareTo(iv);
                return true;
            case DateTime dt when DateTime.TryParse(value, out var dv):
                order = dt.CompareTo(dv);
                return true;
            default:
                return false;
        }
    }

    private static IComparable SortKey(TaskEntity task, TaskField field, DateOnly today) => field switch
    {
        TaskField.Deadline => task.Deadline?.DayNumber ?? int.MaxValue,
        TaskField.Difficulty => task.Difficulty ?? 0,
        TaskField.Progress => task.Progress ?? 0,
        TaskField.CreatedAt => task.CreatedAt ?? DateTime.MinValue,
        TaskField.CompletedAt => task.CompletedAt ?? DateTime.MaxValue,
        TaskField.AssigneeCount => task.TaskAssignees?.Count ?? 0,
        TaskField.Status => task.Status ?? string.Empty,
        TaskField.Priority => task.Priority ?? string.Empty,
        TaskField.RiskLevel => task.RiskLevel ?? string.Empty,
        TaskField.TaskTypeName => task.TaskType?.Name ?? string.Empty,
        _ => 0,
    };
}
