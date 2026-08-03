using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Events;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Tasks.Commands;

/// <summary>
/// Assigns a task directly, without going through the AI recommender.
///
/// The existing accept-recommendation path refuses anyone who is not in the latest suggestion run,
/// so a leader who already knows who should do the work had to run the AI first just to be allowed
/// to name them. This is the same assignment, minus that detour — a null <paramref name="UserId"/>
/// clears the assignee instead.
/// </summary>
public sealed record AssignTaskCommand(int TaskId, int? UserId) : IRequest<bool>;

public sealed class AssignTaskCommandHandler(
    IResourceAuthorizationService authz,
    ITaskRepository taskRepo,
    IProjectRepository projectRepo,
    ITeamRepository teamRepo,
    IMediator mediator
) : IRequestHandler<AssignTaskCommand, bool>
{
    public async Task<bool> Handle(AssignTaskCommand cmd, CancellationToken ct)
    {
        // Assigning is a management action — same rule the AI path and task editing already use.
        var task = await authz.EnsureCanManageTaskAsync(cmd.TaskId, ct);

        if (cmd.UserId is null)
        {
            await taskRepo.ClearTaskAssigneesAsync(cmd.TaskId, ct);
            return true;
        }

        var userId = cmd.UserId.Value;

        // Work may only go to someone who is actually on the project's team; without this the
        // endpoint would happily attach any user id in the database to the task.
        if (!await IsProjectTeamMemberAsync(task.ProjectId, userId, ct))
            throw new InvalidOperationException("The selected user is not a member of this project's team.");

        var existing = await taskRepo.GetTaskAssigneesAsync(cmd.TaskId, ct);
        if (existing.Any(assignee => assignee.UserId == userId))
            return true; // Already theirs — nothing to write, and no second notification.

        await taskRepo.ClearTaskAssigneesAsync(cmd.TaskId, ct);
        await taskRepo.AddTaskAssigneeAsync(TaskAssignee.Create(cmd.TaskId, userId), ct);

        // Same event the AI path raises, so the activity log and notification stay identical
        // regardless of how the assignment was made.
        await mediator.Publish(new TaskAssignedEvent(cmd.TaskId, userId, task.Title), ct);
        return true;
    }

    private async Task<bool> IsProjectTeamMemberAsync(int? projectId, int userId, CancellationToken ct)
    {
        if (projectId is null) return false;

        var project = await projectRepo.GetByIdAsync(projectId.Value, ct)
            ?? throw new NotFoundException("Project", projectId.Value);
        if (project.TeamId is null) return false;

        var team = await teamRepo.GetByIdAsync(project.TeamId.Value, ct);
        return team?.TeamMembers.Any(member => member.UserId == userId) ?? false;
    }
}
