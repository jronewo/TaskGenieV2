using MediatR;
using Microsoft.Extensions.Logging;
using TaskGenie.Application.Events;
using TaskGenie.Application.Features.Notifications.Commands;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Notifications.EventHandlers;

/// <summary>
/// Tells the people who can actually review — the team's LEADERs, plus the project creator — that a
/// task is waiting on them.
/// </summary>
public sealed class TaskSubmittedForReviewNotificationHandler(
    ICurrentUser currentUser,
    IProjectRepository projectRepo,
    ITeamMemberRepository teamMemberRepo,
    IMediator mediator,
    ILogger<TaskSubmittedForReviewNotificationHandler> logger
) : INotificationHandler<TaskSubmittedForReviewEvent>
{
    public async System.Threading.Tasks.Task Handle(TaskSubmittedForReviewEvent notification, CancellationToken ct)
    {
        if (notification.ProjectId is not int projectId) return;

        try
        {
            var project = await projectRepo.GetByIdAsync(projectId, ct);
            if (project is null) return;

            var reviewers = new HashSet<int>();
            if (project.CreatedBy is int creator) reviewers.Add(creator);

            if (project.TeamId is int teamId)
            {
                var members = await teamMemberRepo.GetByTeamIdAsync(teamId, ct);
                foreach (var member in members.Where(m => m.Role == "LEADER" && m.UserId.HasValue))
                    reviewers.Add(member.UserId!.Value);
            }

            // Submitting your own work doesn't need to notify you about it.
            reviewers.Remove(currentUser.UserId);
            if (reviewers.Count == 0) return;

            var title = string.IsNullOrWhiteSpace(notification.Title)
                ? $"Task #{notification.TaskId}"
                : notification.Title;

            foreach (var reviewerId in reviewers)
            {
                await mediator.Send(
                    new CreateNotificationCommand(
                        reviewerId,
                        "TASK_REVIEW",
                        $"\"{title}\" đang chờ review",
                        $"Một thành viên vừa chuyển công việc này sang In Review trong dự án {project.Name}.",
                        notification.TaskId,
                        "TASK",
                        projectId),
                    ct);
            }
        }
        catch (Exception ex)
        {
            // A failed notification must never roll back the status change itself.
            logger.LogWarning(ex, "Could not notify reviewers about task {TaskId}.", notification.TaskId);
        }
    }
}
