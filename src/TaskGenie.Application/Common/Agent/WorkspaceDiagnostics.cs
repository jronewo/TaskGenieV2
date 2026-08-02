using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Application.Common.Agent;

/// <summary>The questions the console can answer without asking a model anything.</summary>
public enum DiagnosticIntent
{
    None,
    AtRisk,
    DueSoon,
    Overdue,
    Unassigned,
    InProgress,
    Overview,
}

/// <summary>
/// Deterministic answers to the handful of questions people actually ask a project chatbot.
///
/// This exists because the provider is the least reliable part of the feature: keys get blocked,
/// quotas run out, networks fail. Those questions are all simple filters over rows we already have,
/// so routing them here means the chat box keeps working on a day when the AI does not — and the
/// numbers are exact rather than a model's paraphrase of a tool result.
/// </summary>
public static class WorkspaceDiagnostics
{
    /// <summary>A deadline this close is worth surfacing before it turns into an overdue task.</summary>
    public const int DueSoonDays = 5;

    private static readonly (DiagnosticIntent Intent, string[] Phrases)[] Vocabulary =
    [
        (DiagnosticIntent.Overdue, ["overdue", "late", "past due", "trễ hạn", "quá hạn", "trễ deadline"]),
        (DiagnosticIntent.DueSoon, ["due soon", "deadline", "sắp đến hạn", "sắp tới hạn", "sắp hết hạn", "gần deadline"]),
        (DiagnosticIntent.AtRisk, ["at risk", "risk estimate", "risky", "rủi ro", "nguy cơ"]),
        (DiagnosticIntent.Unassigned, ["unassigned", "nobody", "no assignee", "chưa được assign", "chưa giao", "chưa ai làm"]),
        (DiagnosticIntent.InProgress, ["in progress", "đang làm", "đang thực hiện", "hôm nay"]),
        (DiagnosticIntent.Overview, ["overview", "summary", "status", "tổng quan", "tình hình", "báo cáo"]),
    ];

    /// <summary>
    /// Matches a question to an intent. Deliberately conservative: an unrecognised question returns
    /// None so it goes to the model rather than getting a confidently wrong canned answer.
    /// </summary>
    public static DiagnosticIntent Detect(string? message)
    {
        if (string.IsNullOrWhiteSpace(message)) return DiagnosticIntent.None;

        var text = message.ToLowerInvariant();

        // Ordered by specificity: "quá hạn" must not be swallowed by the broader deadline phrases.
        foreach (var (intent, phrases) in Vocabulary)
        {
            if (phrases.Any(phrase => text.Contains(phrase, StringComparison.OrdinalIgnoreCase)))
                return intent;
        }

        return DiagnosticIntent.None;
    }

    /// <summary>Renders the answer for an intent over the tasks the caller may already see.</summary>
    public static string Answer(
        DiagnosticIntent intent,
        IReadOnlyList<TaskEntity> tasks,
        DateOnly today,
        string scopeLabel)
    {
        var open = tasks.Where(t => !string.Equals(t.Status, "Done", StringComparison.OrdinalIgnoreCase)).ToList();

        return intent switch
        {
            DiagnosticIntent.AtRisk => Render(
                open.Where(t => t.RiskLevel is "HIGH" or "CRITICAL")
                    .OrderByDescending(t => t.RiskLevel)
                    .ToList(),
                $"Công việc rủi ro cao trong {scopeLabel}",
                "Không có công việc nào ở mức rủi ro HIGH hoặc CRITICAL.",
                t => $"[{t.RiskLevel}] {Describe(t, today)}"),

            DiagnosticIntent.DueSoon => Render(
                open.Where(t => t.Deadline is DateOnly d && d >= today && d <= today.AddDays(DueSoonDays))
                    .OrderBy(t => t.Deadline)
                    .ToList(),
                $"Sắp đến hạn trong {DueSoonDays} ngày tới ({scopeLabel})",
                $"Không có công việc nào đến hạn trong {DueSoonDays} ngày tới.",
                t => $"còn {t.Deadline!.Value.DayNumber - today.DayNumber} ngày — {Describe(t, today)}"),

            DiagnosticIntent.Overdue => Render(
                open.Where(t => t.Deadline is DateOnly d && d < today)
                    .OrderBy(t => t.Deadline)
                    .ToList(),
                $"Đã quá hạn ({scopeLabel})",
                "Không có công việc nào quá hạn.",
                t => $"trễ {today.DayNumber - t.Deadline!.Value.DayNumber} ngày — {Describe(t, today)}"),

            // Listing them is only half the job — the next thing anyone wants is who should take
            // them, so the answer points straight at the ranking skill.
            DiagnosticIntent.Unassigned => WithFollowUp(
                Render(
                    open.Where(t => t.TaskAssignees is null || t.TaskAssignees.Count == 0).ToList(),
                    $"Chưa giao cho ai ({scopeLabel})",
                    "Mọi công việc đang mở đều đã có người nhận.",
                    t => Describe(t, today)),
                open.FirstOrDefault(t => t.TaskAssignees is null || t.TaskAssignees.Count == 0)),

            DiagnosticIntent.InProgress => Render(
                tasks.Where(t => string.Equals(t.Status, "InProgress", StringComparison.OrdinalIgnoreCase)).ToList(),
                $"Đang thực hiện ({scopeLabel})",
                "Không có công việc nào đang ở trạng thái In progress.",
                t => Describe(t, today)),

            DiagnosticIntent.Overview => Overview(tasks, today, scopeLabel),

            _ => string.Empty,
        };
    }

    private static string Overview(IReadOnlyList<TaskEntity> tasks, DateOnly today, string scopeLabel)
    {
        if (tasks.Count == 0) return $"{scopeLabel} chưa có công việc nào.";

        var done = tasks.Count(t => t.Status == "Done");
        var inProgress = tasks.Count(t => t.Status == "InProgress");
        var todo = tasks.Count - done - inProgress;
        var open = tasks.Where(t => t.Status != "Done").ToList();
        var risky = open.Count(t => t.RiskLevel is "HIGH" or "CRITICAL");
        var overdue = open.Count(t => t.Deadline is DateOnly d && d < today);
        var dueSoon = open.Count(t => t.Deadline is DateOnly d && d >= today && d <= today.AddDays(DueSoonDays));
        var unassigned = open.Count(t => t.TaskAssignees is null || t.TaskAssignees.Count == 0);

        return $"""
            Tổng quan {scopeLabel}: {tasks.Count} công việc — {todo} chờ làm, {inProgress} đang làm, {done} xong.
            • Rủi ro cao: {risky}
            • Quá hạn: {overdue}
            • Đến hạn trong {DueSoonDays} ngày: {dueSoon}
            • Chưa giao: {unassigned}
            """;
    }

    /// <summary>Suggests the obvious next step, naming a real task so it can be copied verbatim.</summary>
    private static string WithFollowUp(string answer, TaskEntity? example)
    {
        if (example is null) return answer;

        return $"""
            {answer}

            Gõ "gợi ý người cho task {example.TaskId}" để xem 3 người phù hợp nhất, rồi "giao task {example.TaskId} cho <tên>".
            """;
    }

    private static string Render(
        IReadOnlyList<TaskEntity> matches,
        string heading,
        string emptyMessage,
        Func<TaskEntity, string> line)
    {
        if (matches.Count == 0) return emptyMessage;

        // Capped: a chat bubble listing 200 tasks helps nobody.
        const int max = 12;
        var shown = matches.Take(max).Select(t => $"• {line(t)}");
        var more = matches.Count > max ? $"\n… và {matches.Count - max} công việc khác." : string.Empty;

        return $"{heading} ({matches.Count}):\n{string.Join("\n", shown)}{more}";
    }

    private static string Describe(TaskEntity task, DateOnly today)
    {
        var title = string.IsNullOrWhiteSpace(task.Title) ? $"Task #{task.TaskId}" : task.Title;
        var owner = task.TaskAssignees is { Count: > 0 }
            ? task.TaskAssignees.First().User?.Name ?? "đã giao"
            : "chưa giao";

        var deadline = task.Deadline is DateOnly d
            ? d < today ? $", hạn {d} (đã trễ)" : $", hạn {d}"
            : string.Empty;

        return $"#{task.TaskId} {title} ({task.Status}, {owner}{deadline})";
    }
}
