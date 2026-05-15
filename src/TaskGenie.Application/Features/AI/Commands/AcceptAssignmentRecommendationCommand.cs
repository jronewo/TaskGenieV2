using MediatR;
using TaskGenie.Application.Events;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.AI.Commands;

public sealed record AcceptAssignmentRecommendationCommand(
    int TaskId,
    int UserId
) : IRequest<bool>;

public sealed class AcceptAssignmentRecommendationCommandHandler(
    ITaskRepository taskRepo,
    IMediator mediator
) : IRequestHandler<AcceptAssignmentRecommendationCommand, bool>
{
    public async Task<bool> Handle(AcceptAssignmentRecommendationCommand cmd, CancellationToken ct)
    {
        var existingAssignees = await taskRepo.GetTaskAssigneesAsync(cmd.TaskId, ct);

        // Always clear existing assignees to enforce 1-task-1-person rule
        await taskRepo.ClearTaskAssigneesAsync(cmd.TaskId, ct);

        // If the same user was already assigned → this is an unassign action
        if (existingAssignees.Any(a => a.UserId == cmd.UserId))
        {
            return true; // Successfully unassigned
        }

        // Assign the new user
        var assignee = TaskAssignee.Create(cmd.TaskId, cmd.UserId);
        await taskRepo.AddTaskAssigneeAsync(assignee, ct);

        // Publish event so notification handlers can notify the user
        var task = await taskRepo.GetByIdAsync(cmd.TaskId, ct);
        await mediator.Publish(
            new TaskAssignedEvent(cmd.TaskId, cmd.UserId, task?.Title),
            ct);

        return true;
    }
}
