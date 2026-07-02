using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Projects.DTOs;
using TaskGenie.Application.Features.RewardPenalty;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Projects.Queries;

/// <summary>Read-only preview of project summary. Does NOT close the project or award scores.</summary>
public record GetProjectSummaryQuery(int ProjectId) : IRequest<ProjectSummaryDto>;

public class GetProjectSummaryQueryHandler(
    IProjectRepository projectRepo,
    ITaskRepository taskRepo,
    ITeamMemberRepository teamMemberRepo,
    IUserScoreRepository userScoreRepo)
    : IRequestHandler<GetProjectSummaryQuery, ProjectSummaryDto>
{
    public async Task<ProjectSummaryDto> Handle(GetProjectSummaryQuery request, CancellationToken ct)
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

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        int totalTasks  = tasks.Count;
        int doneTasks   = tasks.Count(t => t.Status == "Done");
        int inProgTasks = tasks.Count(t => t.Status == "InProgress");
        int todoTasks   = tasks.Count(t => t.Status == "Todo");

        var doneWithDeadline = tasks.Where(t => t.Status == "Done" && t.Deadline.HasValue).ToList();
        double onTimeRate = doneWithDeadline.Count == 0 ? 100.0
            : doneWithDeadline.Count(t =>
            {
                var completedDay = t.CompletedAt.HasValue
                    ? DateOnly.FromDateTime(t.CompletedAt.Value)
                    : today;
                return completedDay <= t.Deadline!.Value;
            }) * 100.0 / doneWithDeadline.Count;

        int daysVsDeadline = project.Deadline.HasValue
            ? project.Deadline.Value.DayNumber - today.DayNumber
            : 0;

        string completionStatus = !project.Deadline.HasValue ? "OnTime"
            : daysVsDeadline > 0 ? "Early"
            : daysVsDeadline == 0 ? "OnTime"
            : "Late";

        int closureAmount = completionStatus switch
        {
            "Early" => Math.Min(120, 50 + daysVsDeadline * 2),
            "Late"  => Math.Abs(daysVsDeadline) * 3,
            _       => 50
        };
        string closureType = completionStatus == "Late" ? "PENALTY" : "REWARD";

        var existingScores = await userScoreRepo.GetByProjectIdAsync(request.ProjectId, ct);

        var memberSummaries = memberUserIds.Select(uid =>
        {
            var member = members.First(m => m.UserId == uid);
            int taskScore    = existingScores.Where(s => s.UserId == uid && s.TaskId.HasValue).Sum(s => s.Amount);
            int closureScore = closureType == "REWARD" ? closureAmount : -closureAmount;
            int total        = taskScore + closureScore;
            var (level, _, _, _) = ScoreLevelHelper.GetLevel(total);

            return new ProjectMemberScoreDto
            {
                UserId            = uid,
                UserName          = member.User?.Name,
                Avatar            = member.User?.Avatar,
                Level             = level,
                TaskScore         = taskScore,
                ClosureScore      = closureScore,
                TotalProjectScore = total
            };
        }).OrderByDescending(m => m.TotalProjectScore).ToList();

        return new ProjectSummaryDto
        {
            ProjectId                    = project.ProjectId,
            ProjectName                  = project.Name,
            Deadline                     = project.Deadline,
            ClosedAt                     = today,
            ProjectCompletionStatus      = completionStatus,
            DaysVsDeadline               = daysVsDeadline,
            TotalTasks                   = totalTasks,
            DoneTasks                    = doneTasks,
            InProgressTasks              = inProgTasks,
            TodoTasks                    = todoTasks,
            OnTimeTaskRate               = Math.Round(onTimeRate, 1),
            ProjectClosureScorePerMember = closureType == "REWARD" ? closureAmount : -closureAmount,
            ProjectClosureScoreType      = closureType,
            MemberScores                 = memberSummaries
        };
    }
}
