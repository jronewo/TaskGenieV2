using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.RewardPenalty;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Export;

public record ExportProjectQuery(int ProjectId, string Format) : IRequest<ExportResult>;

public record ExportResult(byte[] Data, string ContentType, string FileName);

public class ExportProjectQueryHandler(
    IProjectRepository projectRepo,
    ITaskRepository taskRepo,
    ITeamMemberRepository teamMemberRepo,
    IUserScoreRepository userScoreRepo,
    IProjectExportService exportService)
    : IRequestHandler<ExportProjectQuery, ExportResult>
{
    public async Task<ExportResult> Handle(ExportProjectQuery request, CancellationToken ct)
    {
        var project = await projectRepo.GetByIdAsync(request.ProjectId, ct)
            ?? throw new NotFoundException("Project", request.ProjectId);

        var tasks = await taskRepo.GetByProjectIdWithDetailsAsync(request.ProjectId, ct);

        var members = project.TeamId.HasValue
            ? await teamMemberRepo.GetByTeamIdAsync(project.TeamId.Value, ct)
            : [];

        var memberUserIds = members
            .Where(m => m.UserId.HasValue)
            .Select(m => m.UserId!.Value)
            .ToList();

        var scores = await userScoreRepo.GetByProjectIdAsync(request.ProjectId, ct);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // ── Build task rows ───────────────────────────────────────────────────
        var taskRows = tasks.Select((t, i) =>
        {
            bool? isLate = t.Deadline.HasValue && t.Status == "Done"
                ? (t.CompletedAt.HasValue
                    ? DateOnly.FromDateTime(t.CompletedAt.Value) > t.Deadline.Value
                    : today > t.Deadline.Value)
                : null;

            int? daysLateOrEarly = t.Deadline.HasValue && t.Status == "Done"
                ? (t.CompletedAt.HasValue
                    ? t.Deadline.Value.DayNumber - DateOnly.FromDateTime(t.CompletedAt.Value).DayNumber
                    : t.Deadline.Value.DayNumber - today.DayNumber)
                : null;

            var assigneeNames = t.TaskAssignees
                .Where(a => a.User != null)
                .Select(a => a.User!.Name)
                .ToList();

            return new TaskExportRow
            {
                No             = i + 1,
                Title          = t.Title ?? "",
                Status         = t.Status,
                Priority       = t.Priority,
                Difficulty     = t.Difficulty,
                Deadline       = t.Deadline,
                Progress       = t.Progress,
                EstimatedTime  = t.EstimatedTime,
                ActualTime     = t.ActualTime,
                CompletedAt    = t.CompletedAt,
                IsLate         = isLate,
                DaysLateOrEarly = daysLateOrEarly,
                Assignees      = string.Join(", ", assigneeNames)
            };
        }).ToList();

        // ── Build member rows ─────────────────────────────────────────────────
        var memberRows = memberUserIds.Select((uid, i) =>
        {
            var member = members.First(m => m.UserId == uid);
            int totalScore = scores.Where(s => s.UserId == uid).Sum(s => s.Amount);

            int completedCount = tasks.Count(t =>
                t.Status == "Done" &&
                t.TaskAssignees.Any(a => a.UserId == uid));

            int lateCount = tasks.Count(t =>
                t.Status == "Done" &&
                t.Deadline.HasValue &&
                t.TaskAssignees.Any(a => a.UserId == uid) &&
                (t.CompletedAt.HasValue
                    ? DateOnly.FromDateTime(t.CompletedAt.Value) > t.Deadline.Value
                    : today > t.Deadline.Value));

            var (level, _, _, _) = ScoreLevelHelper.GetLevel(totalScore);

            return new MemberExportRow
            {
                No               = i + 1,
                UserName         = member.User?.Name ?? $"User {uid}",
                TotalProjectScore = totalScore,
                Level            = level,
                CompletedTasks   = completedCount,
                LateTasks        = lateCount
            };
        }).OrderByDescending(m => m.TotalProjectScore).ToList();

        // Renumber after sort
        for (int i = 0; i < memberRows.Count; i++) memberRows[i].No = i + 1;

        // ── Stats ─────────────────────────────────────────────────────────────
        int totalTasks  = tasks.Count;
        int doneTasks   = tasks.Count(t => t.Status == "Done");
        int inProgTasks = tasks.Count(t => t.Status == "InProgress");
        int todoTasks   = tasks.Count(t => t.Status == "Todo");

        var doneWithDeadline = tasks.Where(t => t.Status == "Done" && t.Deadline.HasValue).ToList();
        double onTimeRate = doneWithDeadline.Count == 0 ? 100.0
            : doneWithDeadline.Count(t =>
            {
                var completedDay = t.CompletedAt.HasValue
                    ? DateOnly.FromDateTime(t.CompletedAt.Value) : today;
                return completedDay <= t.Deadline!.Value;
            }) * 100.0 / doneWithDeadline.Count;

        var exportData = new ProjectExportData
        {
            ProjectId        = project.ProjectId,
            ProjectName      = project.Name ?? "Untitled",
            Description      = project.Description,
            Status           = project.Status,
            OrganizationName = project.Organization?.Name,
            TeamName         = project.Team?.Name,
            Deadline         = project.Deadline,
            ExportedAt       = DateTime.UtcNow,
            TotalTasks       = totalTasks,
            DoneTasks        = doneTasks,
            InProgressTasks  = inProgTasks,
            TodoTasks        = todoTasks,
            OnTimeTaskRate   = Math.Round(onTimeRate, 1),
            Tasks            = taskRows,
            Members          = memberRows
        };

        var format = request.Format.ToLowerInvariant();
        if (format == "xlsx")
        {
            var bytes = exportService.ExportToExcel(exportData);
            var fileName = $"project_{project.ProjectId}_{today:yyyyMMdd}.xlsx";
            return new ExportResult(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }
        else
        {
            var bytes = exportService.ExportToPdf(exportData);
            var fileName = $"project_{project.ProjectId}_{today:yyyyMMdd}.pdf";
            return new ExportResult(bytes, "application/pdf", fileName);
        }
    }
}
