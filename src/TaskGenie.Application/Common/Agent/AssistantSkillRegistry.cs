using System.Text.RegularExpressions;
using TaskGenie.Application.Features.AI.Commands;
using TaskGenie.Application.Features.Projects.Commands;
using TaskGenie.Application.Features.Tasks.Commands;
using TaskGenie.Application.Features.Tasks.Queries;

namespace TaskGenie.Application.Common.Agent;

/// <summary>
/// Everything the assistant can do, and which use case each one calls.
///
/// This is the whole contract: a sentence either matches a skill here or it is refused. No model
/// decides what to invoke, so the blast radius is exactly this file — and every skill still goes
/// through MediatR, which means the same authorization applies as when the user clicks in the UI.
///
/// Read skills come first so a question is never mistaken for a command.
/// </summary>
public static class AssistantSkillRegistry
{
    private static Regex Pattern(string expression) =>
        new(expression, RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    /// <summary>Read-only skills, backed by <see cref="WorkspaceDiagnostics"/>.</summary>
    private static AssistantSkill Diagnostic(
        string id,
        string title,
        string example,
        DiagnosticIntent intent,
        params string[] triggers) =>
        new(
            id,
            title,
            example,
            ["GetTasksByProjectQuery", "GetMyTasksQuery"],
            Mutates: false,
            triggers.Select(t => Pattern(t)).ToArray(),
            (_, _, _) => System.Threading.Tasks.Task.FromResult(intent.ToString()));

    /// <summary>
    /// The diagnostic skills carry their intent in the result; the agent resolves the rows. Kept
    /// separate so the row-reading and permission checks live in one place, not six.
    /// </summary>
    public static DiagnosticIntent? DiagnosticIntentOf(AssistantSkill skill) => skill.Id switch
    {
        "at-risk" => DiagnosticIntent.AtRisk,
        "due-soon" => DiagnosticIntent.DueSoon,
        "overdue" => DiagnosticIntent.Overdue,
        "unassigned" => DiagnosticIntent.Unassigned,
        "in-progress" => DiagnosticIntent.InProgress,
        "overview" => DiagnosticIntent.Overview,
        _ => null,
    };

    private static IReadOnlyList<AssistantSkill> Broad { get; } =
    [
        // ---------- Read ----------
        Diagnostic("overdue", "Công việc quá hạn", "task nào quá hạn?", DiagnosticIntent.Overdue,
            @"quá\s*hạn", @"trễ\s*(hạn|deadline)", @"\boverdue\b", @"past\s+due"),

        Diagnostic("due-soon", "Sắp đến hạn", "task nào sắp đến hạn?", DiagnosticIntent.DueSoon,
            @"sắp\s*(đến|tới|hết)\s*hạn", @"gần\s*deadline", @"due\s+soon", @"\bdeadline\b"),

        Diagnostic("at-risk", "Rủi ro cao", "task nào đang rủi ro?", DiagnosticIntent.AtRisk,
            @"rủi\s*ro", @"nguy\s*cơ", @"at\s+risk", @"risk\s+estimate", @"\brisky\b"),

        Diagnostic("unassigned", "Chưa giao cho ai", "task nào chưa được assign?", DiagnosticIntent.Unassigned,
            @"chưa\s*(được\s*)?(assign|giao)", @"chưa\s*ai\s*làm", @"\bunassigned\b", @"no\s+assignee"),

        Diagnostic("in-progress", "Đang thực hiện", "hôm nay đang làm gì?", DiagnosticIntent.InProgress,
            @"đang\s*(làm|thực\s*hiện)", @"in\s+progress", @"hôm\s*nay"),

        Diagnostic("overview", "Tổng quan", "cho tôi tổng quan", DiagnosticIntent.Overview,
            @"tổng\s*quan", @"tình\s*hình", @"báo\s*cáo", @"\boverview\b", @"\bsummary\b"),
    ];

    private static IReadOnlyList<AssistantSkill> Targeted { get; } =
    [
        // ---------- Write ----------
        new AssistantSkill(
            "create-project",
            "Tạo dự án",
            "tạo dự án tên là Website Revamp",
            ["CreateProjectCommand"],
            Mutates: true,
            [
                // Name and deadline are named parts, so a long sentence still yields clean fields.
                Pattern(@"(?:tạo|create).*?(?:dự\s*án|project).*?(?:tên\s*(?:là|:)?|called|named)\s*(?<name>.+?)(?:\s*(?:,|và|and)?\s*(?:ngày\s*(?:hoàn\s*thành|kết\s*thúc)|deadline|hạn|due)\s*(?:là|:)?\s*(?<deadline>[\d\/\-\.]+))?\s*$"),
                Pattern(@"tạo\s+(?:một\s+|1\s+)?(?:dự\s*án|project)\s+(?:mới\s*)?(?<name>.+)"),
                Pattern(@"create\s+(?:a\s+)?(?:new\s+)?project\s+(?<name>.+)"),
            ],
            async (args, context, ct) =>
            {
                var name = Clean(args.Text("name"));
                var rawDeadline = args.Text("deadline");

                // Nothing is created on a half-understood sentence: a project named "mới cho tôi"
                // is worse than a question, because the user has to go and delete it.
                if (string.IsNullOrWhiteSpace(name) || LooksLikeFiller(name))
                {
                    return "Tôi cần tên dự án. Ví dụ: \"tạo dự án tên là Website Revamp, ngày hoàn thành 31/12/2026\".";
                }

                DateOnly? deadline = null;
                if (!string.IsNullOrWhiteSpace(rawDeadline))
                {
                    deadline = ParseDate(rawDeadline);
                    if (deadline is null)
                        return $"Tôi không đọc được ngày \"{rawDeadline}\". Dùng dạng ngày/tháng/năm, ví dụ 31/12/2026.";
                }

                var project = await context.Mediator.Send(new CreateProjectCommand(name, null, null, deadline), ct);
                var when = deadline is null ? "" : $", hạn {deadline}";
                return $"Đã tạo dự án \"{project.Name}\" (#{project.ProjectId}){when}.";
            }),

        new AssistantSkill(
            "create-task",
            "Tạo công việc",
            "tạo task Sửa lỗi đăng nhập",
            ["CreateTaskCommand"],
            Mutates: true,
            [
                Pattern(@"(?:tạo|thêm|create|add).*?(?:task|công\s*việc).*?(?:tên\s*(?:là|:)?|called|named)\s*(?<title>.+?)(?:\s*(?:,|và|and)?\s*(?:ưu\s*tiên|priority)\s*(?:là|:)?\s*(?<priority>low|medium|high|critical|thấp|trung\s*bình|cao))?(?:\s*(?:,|và|and)?\s*(?:hạn|deadline|due)\s*(?:là|:)?\s*(?<deadline>[\d\/\-\.]+))?\s*$"),
                Pattern(@"(?:tạo|thêm)\s+(?:một\s+|1\s+)?(?:task|công\s*việc)\s+(?:mới\s*)?(?<title>.+)"),
                Pattern(@"(?:create|add)\s+(?:a\s+)?(?:new\s+)?task\s+(?<title>.+)"),
            ],
            async (args, context, ct) =>
            {
                if (context.ProjectId is not int projectId)
                    return "Hãy chọn một dự án trong khung chat trước, rồi tôi mới biết tạo task ở đâu.";

                var title = Clean(args.Text("title"));
                if (string.IsNullOrWhiteSpace(title) || LooksLikeFiller(title))
                    return "Task này tên là gì? Ví dụ: \"tạo task tên là Sửa lỗi đăng nhập, ưu tiên cao\".";

                var rawDeadline = args.Text("deadline");
                DateOnly? deadline = null;
                if (!string.IsNullOrWhiteSpace(rawDeadline))
                {
                    deadline = ParseDate(rawDeadline);
                    if (deadline is null)
                        return $"Tôi không đọc được ngày \"{rawDeadline}\". Dùng dạng 31/12/2026.";
                }

                var priority = NormalisePriority(args.Text("priority")) ?? "Medium";

                var task = await context.Mediator.Send(
                    new CreateTaskCommand(projectId, title, null, priority, deadline?.ToString("yyyy-MM-dd"), null), ct);

                return $"Đã tạo task \"{task.Title}\" (#{task.TaskId}), ưu tiên {priority}"
                       + (deadline is null ? "." : $", hạn {deadline}.");
            }),

        new AssistantSkill(
            "update-status",
            "Đổi trạng thái công việc",
            "chuyển task 12 sang done",
            ["UpdateTaskProgressCommand"],
            Mutates: true,
            [
                Pattern(@"(?:chuyển|đổi|cập\s*nhật)\s+task\s+(?:số\s+)?#?(?<id>\d+)\s+(?:sang|thành|về)\s+(?<status>todo|inprogress|in\s*progress|done|xong|hoàn\s*thành|đang\s*làm)"),
                Pattern(@"(?:đánh\s*dấu)\s+task\s+(?:số\s+)?#?(?<id>\d+)\s+(?:là\s+)?(?<status>done|xong|hoàn\s*thành)"),
                Pattern(@"(?:mark|set|move)\s+task\s+#?(?<id>\d+)\s+(?:as\s+|to\s+)?(?<status>todo|in\s*progress|done)"),
            ],
            async (args, context, ct) =>
            {
                var taskId = args.Number("id");
                if (taskId is null) return "Task số mấy?";

                var status = NormaliseStatus(args.Text("status"));
                if (status is null) return "Trạng thái phải là Todo, InProgress hoặc Done.";

                await context.Mediator.Send(
                    new UpdateTaskProgressCommand(taskId.Value, status, status == "Done" ? 100 : null, null, null), ct);

                return $"Đã chuyển task #{taskId} sang {status}.";
            }),

        new AssistantSkill(
            "suggest-assignee",
            "Gợi ý 3 người phù hợp",
            "gợi ý người cho task 12",
            ["GetAssignmentRecommendationsCommand"],
            Mutates: true,
            [
                Pattern(@"(?:gợi\s*ý|đề\s*xuất)\s+(?:người|ai)\s+(?:phù\s*hợp\s+)?(?:cho\s+)?task\s+(?:số\s+)?#?(?<id>\d+)"),
                Pattern(@"who\s+should\s+(?:do|take)\s+task\s+#?(?<id>\d+)"),
            ],
            async (args, context, ct) =>
            {
                if (context.ProjectId is not int projectId)
                    return "Hãy chọn dự án chứa task này trong khung chat trước.";

                var taskId = args.Number("id");
                if (taskId is null) return "Task số mấy?";

                var result = await context.Mediator.Send(
                    new GetAssignmentRecommendationsCommand(taskId.Value, projectId), ct);

                if (result.Suggestions.Count == 0) return "Chưa tìm được ai phù hợp trong nhóm của dự án này.";

                // Three is enough to choose from; a longer ranking just moves the decision problem.
                var lines = result.Suggestions.Take(3).Select((s, i) =>
                    $"{i + 1}. {s.UserName} — tổng {Math.Round(s.Score)} điểm "
                    + $"(kỹ năng {Math.Round(s.SkillMatchScore)}, tải việc {Math.Round(s.WorkloadScore)})");

                return $"""
                    3 người phù hợp nhất cho task #{taskId}:
                    {string.Join("\n", lines)}

                    Chọn bằng cách gõ: giao task {taskId} cho {result.Suggestions[0].UserName}
                    """;
            }),

        new AssistantSkill(
            "assign-task",
            "Giao việc",
            "giao task 12 cho Linh",
            ["GetAssignmentRecommendationsCommand", "AcceptAssignmentRecommendationCommand"],
            Mutates: true,
            [
                Pattern(@"(?:giao|phân\s*công)\s+task\s+(?:số\s+)?#?(?<id>\d+)\s+cho\s+(?<who>.+)"),
                Pattern(@"assign\s+task\s+#?(?<id>\d+)\s+to\s+(?<who>.+)"),
            ],
            async (args, context, ct) =>
            {
                if (context.ProjectId is not int projectId)
                    return "Hãy chọn dự án chứa task này trong khung chat trước.";

                var taskId = args.Number("id");
                var who = Clean(args.Text("who"));
                if (taskId is null || string.IsNullOrWhiteSpace(who)) return "Cú pháp: giao task 12 cho Linh.";

                // Assignment only accepts someone from the latest recommendation run, so the run has
                // to happen first — the same two-step the UI performs.
                var run = await context.Mediator.Send(
                    new GetAssignmentRecommendationsCommand(taskId.Value, projectId), ct);

                var candidate = run.Suggestions.FirstOrDefault(s =>
                    s.UserName?.Contains(who, StringComparison.OrdinalIgnoreCase) == true);

                if (candidate is null)
                {
                    var names = string.Join(", ", run.Suggestions.Take(5).Select(s => s.UserName));
                    return names.Length == 0
                        ? "Không có ai trong nhóm dự án này để giao."
                        : $"Không tìm thấy \"{who}\". Trong nhóm có: {names}.";
                }

                await context.Mediator.Send(
                    new AcceptAssignmentRecommendationCommand(taskId.Value, candidate.UserId, "Giao qua trợ lý"), ct);

                return $"Đã giao task #{taskId} cho {candidate.UserName}.";
            }),

        new AssistantSkill(
            "analyse-risk",
            "Phân tích rủi ro một task",
            "phân tích rủi ro task 12",
            ["AnalyzeTaskRiskCommand"],
            Mutates: true,
            [
                Pattern(@"(?:phân\s*tích|đánh\s*giá|tính)\s+(?:rủi\s*ro|risk)\s+(?:cho\s+)?task\s+(?:số\s+)?#?(?<id>\d+)"),
                Pattern(@"analy[sz]e\s+risk\s+(?:for\s+)?task\s+#?(?<id>\d+)"),
            ],
            async (args, context, ct) =>
            {
                var taskId = args.Number("id");
                if (taskId is null) return "Task số mấy?";

                var result = await context.Mediator.Send(new AnalyzeTaskRiskCommand(taskId.Value), ct);
                if (result is null) return $"Không tìm thấy task #{taskId}.";

                return $"Task #{taskId}: mức {result.RiskLevel} ({Math.Round(result.TotalScore)} điểm).\n{result.Explanation}";
            }),

        new AssistantSkill(
            "task-detail",
            "Xem chi tiết công việc",
            "chi tiết task 12",
            ["GetTaskByIdQuery"],
            Mutates: false,
            [
                Pattern(@"(?:chi\s*tiết|xem|thông\s*tin)\s+task\s+(?:số\s+)?#?(?<id>\d+)"),
                Pattern(@"show\s+(?:me\s+)?task\s+#?(?<id>\d+)"),
            ],
            async (args, context, ct) =>
            {
                var taskId = args.Number("id");
                if (taskId is null) return "Task số mấy?";

                var task = await context.Mediator.Send(new GetTaskByIdQuery(taskId.Value), ct);
                if (task is null) return $"Không tìm thấy task #{taskId}.";

                var owner = task.Assignees.Count > 0
                    ? string.Join(", ", task.Assignees.Select(a => a.UserName))
                    : "chưa giao";

                return $"""
                    #{task.TaskId} {task.Title}
                    Trạng thái: {task.Status} · Ưu tiên: {task.Priority} · Rủi ro: {task.RiskLevel ?? "chưa đánh giá"}
                    Người làm: {owner}{(task.Deadline is null ? "" : $" · Hạn: {task.Deadline}")}
                    {task.Description}
                    """.Trim();
            }),
    ];

    /// <summary>
    /// Order is the disambiguation rule. Skills that name a specific task come first: "phân tích
    /// rủi ro task 12" is a command about one task, and the broad "rủi ro" listing would otherwise
    /// swallow it. Broad questions are the fallback, never the first guess.
    ///
    /// Declared after both lists on purpose — static initialisers run in textual order, and putting
    /// this first silently produced an empty registry.
    /// </summary>
    public static IReadOnlyList<AssistantSkill> All { get; } = [.. Targeted, .. Broad];

    /// <summary>First skill whose pattern claims the message, with its extracted arguments.</summary>
    public static (AssistantSkill Skill, SkillArgs Args)? Match(string? message)
    {
        if (string.IsNullOrWhiteSpace(message)) return null;

        foreach (var skill in All)
        {
            var args = skill.TryMatch(message);
            if (args is not null) return (skill, args);
        }
        return null;
    }

    /// <summary>Trailing politeness ("giúp tôi", "nhé") is not part of a name.</summary>
    private static string? Clean(string? value)
    {
        if (value is null) return null;

        var cleaned = Regex.Replace(
            value,
            @"\s*(giúp\s*(tôi|mình|em)|nhé|nha|với|please|for\s+me)\s*[.!?]*$",
            string.Empty,
            RegexOptions.IgnoreCase);

        return cleaned.Trim().Trim('"', '\'', '.', ',').Trim();
    }

    /// <summary>
    /// Words left over when a sentence matched the verb but carried no real name. Creating a project
    /// called "mới cho tôi" is a worse outcome than asking again.
    /// </summary>
    private static bool LooksLikeFiller(string value) =>
        Regex.IsMatch(value, @"^(mới|new|cho\s*tôi|giúp\s*tôi|đi|này|nào)?[\s\p{P}]*$", RegexOptions.IgnoreCase)
        || value.Length < 2;

    /// <summary>Accepts the day-first forms people actually type, plus ISO.</summary>
    private static DateOnly? ParseDate(string raw)
    {
        string[] formats = ["d/M/yyyy", "dd/MM/yyyy", "d-M-yyyy", "dd-MM-yyyy", "d.M.yyyy", "yyyy-MM-dd"];

        return DateOnly.TryParseExact(
            raw.Trim(),
            formats,
            System.Globalization.CultureInfo.InvariantCulture,
            System.Globalization.DateTimeStyles.None,
            out var parsed)
            ? parsed
            : null;
    }

    private static string? NormalisePriority(string? raw) =>
        Regex.Replace(raw ?? string.Empty, @"\s+", string.Empty).ToLowerInvariant() switch
        {
            "low" or "thấp" => "Low",
            "medium" or "trungbình" => "Medium",
            "high" or "cao" => "High",
            "critical" => "Critical",
            _ => null,
        };

    private static string? NormaliseStatus(string? raw) =>
        Regex.Replace(raw ?? string.Empty, @"\s+", string.Empty).ToLowerInvariant() switch
        {
            "todo" => "Todo",
            "inprogress" or "đanglàm" => "InProgress",
            "done" or "xong" or "hoànthành" => "Done",
            _ => null,
        };
}
