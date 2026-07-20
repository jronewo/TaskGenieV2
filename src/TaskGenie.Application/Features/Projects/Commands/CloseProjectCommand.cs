using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Projects.DTOs;
using TaskGenie.Application.Features.RewardPenalty;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Projects.Commands;

public record CloseProjectCommand(int ProjectId) : IRequest<ProjectSummaryDto>;

public class CloseProjectCommandHandler(
    IProjectRepository projectRepo,
    ITaskRepository taskRepo,
    ITeamMemberRepository teamMemberRepo,
    IUserScoreRepository userScoreRepo)
    : IRequestHandler<CloseProjectCommand, ProjectSummaryDto>
{
    public async Task<ProjectSummaryDto> Handle(CloseProjectCommand request, CancellationToken ct)
    {
        var project = await projectRepo.GetByIdAsync(request.ProjectId, ct)
            ?? throw new NotFoundException("Project", request.ProjectId);

        if (project.Status == "Completed")
            throw new InvalidOperationException("Dự án đã được đóng.");

        // Load tasks with assignees
        var tasks = await taskRepo.GetByProjectIdWithDetailsAsync(request.ProjectId, ct);

        // Load team members
        var members = project.TeamId.HasValue
            ? await teamMemberRepo.GetByTeamIdAsync(project.TeamId.Value, ct)
            : [];

        var memberUserIds = members
            .Where(m => m.UserId.HasValue)
            .Select(m => m.UserId!.Value)
            .ToList();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // ── Task stats ────────────────────────────────────────────────────────
        int totalTasks    = tasks.Count;
        int doneTasks     = tasks.Count(t => t.Status == "Done");
        int inProgTasks   = tasks.Count(t => t.Status == "InProgress");
        int todoTasks     = tasks.Count(t => t.Status == "Todo");

        // On-time rate: Done tasks completed before or on their deadline
        var donWithDeadline = tasks.Where(t => t.Status == "Done" && t.Deadline.HasValue).ToList();
        double onTimeRate = donWithDeadline.Count == 0 ? 100.0
            : donWithDeadline.Count(t =>
            {
                var completedDay = t.CompletedAt.HasValue
                    ? DateOnly.FromDateTime(t.CompletedAt.Value)
                    : today;
                return completedDay <= t.Deadline!.Value;
            }) * 100.0 / donWithDeadline.Count;

        // ── Project-level closure score ───────────────────────────────────────
        int closureAmount;
        string closureType;
        string completionStatus;
        int daysVsDeadline = 0;

        if (project.Deadline.HasValue)
        {
            daysVsDeadline = project.Deadline.Value.DayNumber - today.DayNumber; // positive = early
            if (daysVsDeadline > 0)
            {
                completionStatus = "Early";
                // bonus: 50 base + 2 per day early, capped at 120
                closureAmount = Math.Min(120, 50 + daysVsDeadline * 2);
                closureType = "REWARD";
            }
            else if (daysVsDeadline == 0)
            {
                completionStatus = "OnTime";
                closureAmount = 50;
                closureType = "REWARD";
            }
            else
            {
                completionStatus = "Late";
                // penalty: 3 pts per day late
                closureAmount = Math.Abs(daysVsDeadline) * 3;
                closureType = "PENALTY";
            }
        }
        else
        {
            completionStatus = "OnTime";
            closureAmount = 50;
            closureType = "REWARD";
            daysVsDeadline = 0;
        }

        // ── Close the project ─────────────────────────────────────────────────
        project.Update(null, null, "Completed", null, null);
        await projectRepo.UpdateAsync(project, ct);

        // ── Award closure scores to all team members ──────────────────────────
        var closureScores = new List<UserScore>();
        foreach (int uid in memberUserIds)
        {
            UserScore score = closureType == "REWARD"
                ? UserScore.CreateReward(uid, closureAmount,
                    $"Dự án '{project.Name}' đóng {completionStatus.ToLower()} (daysVsDeadline={daysVsDeadline}).",
                    projectId: request.ProjectId)
                : UserScore.CreatePenalty(uid, closureAmount,
                    $"Dự án '{project.Name}' đóng trễ {Math.Abs(daysVsDeadline)} ngày.",
                    projectId: request.ProjectId);

            closureScores.Add(score);
            await userScoreRepo.AddAsync(score, ct);
        }

        // ── Load existing task-level scores for this project ──────────────────
        var existingScores = await userScoreRepo.GetByProjectIdAsync(request.ProjectId, ct);

        // ── Build per-member summary ──────────────────────────────────────────
        var memberSummaries = memberUserIds.Select(uid =>
        {
            var member = members.First(m => m.UserId == uid);
            int taskScore    = existingScores
                .Where(s => s.UserId == uid && s.TaskId.HasValue)
                .Sum(s => s.Amount);
            int closureScore = closureScores
                .Where(s => s.UserId == uid)
                .Sum(s => s.Amount);

            int totalProjectScore = taskScore + closureScore;
            var (level, _, _, _) = ScoreLevelHelper.GetLevel(totalProjectScore);

            return new ProjectMemberScoreDto
            {
                UserId           = uid,
                UserName         = member.User?.Name,
                Avatar           = member.User?.Avatar,
                Level            = level,
                TaskScore        = taskScore,
                ClosureScore     = closureScore,
                TotalProjectScore = totalProjectScore
            };
        }).OrderByDescending(m => m.TotalProjectScore).ToList();

        return new ProjectSummaryDto
        {
            ProjectId                   = project.ProjectId,
            ProjectName                 = project.Name,
            Deadline                    = project.Deadline,
            ClosedAt                    = today,
            ProjectCompletionStatus     = completionStatus,
            DaysVsDeadline              = daysVsDeadline,
            TotalTasks                  = totalTasks,
            DoneTasks                   = doneTasks,
            InProgressTasks             = inProgTasks,
            TodoTasks                   = todoTasks,
            OnTimeTaskRate              = Math.Round(onTimeRate, 1),
            ProjectClosureScorePerMember = closureType == "REWARD" ? closureAmount : -closureAmount,
            ProjectClosureScoreType     = closureType,
            MemberScores                = memberSummaries
        };
    }
}
