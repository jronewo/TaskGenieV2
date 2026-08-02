using MediatR;
using TaskGenie.Application.Events;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.AI.Commands;

public sealed record AcceptAssignmentRecommendationCommand(
    int TaskId,
    int UserId,
    string? Outcome = null
) : IRequest<bool>;

public sealed class AcceptAssignmentRecommendationCommandHandler(
    ICurrentUser currentUser,
    IResourceAuthorizationService authz,
    ITaskRepository taskRepo,
    IAiRecommendationRepository recommendationRepo,
    IMediator mediator
) : IRequestHandler<AcceptAssignmentRecommendationCommand, bool>
{
    public async Task<bool> Handle(AcceptAssignmentRecommendationCommand cmd, CancellationToken ct)
    {
        var task = await authz.EnsureCanManageTaskAsync(cmd.TaskId, ct);

        var latestRecommendations = await recommendationRepo.GetLatestRunByTaskIdAsync(cmd.TaskId, ct);
        if (latestRecommendations.All(recommendation => recommendation.SuggestedUserId != cmd.UserId))
            throw new InvalidOperationException("The selected user is not part of the latest recommendation run.");

        var existingAssignees = await taskRepo.GetTaskAssigneesAsync(cmd.TaskId, ct);
        if (existingAssignees.All(assignee => assignee.UserId != cmd.UserId))
        {
            await taskRepo.ClearTaskAssigneesAsync(cmd.TaskId, ct);
            await taskRepo.AddTaskAssigneeAsync(TaskAssignee.Create(cmd.TaskId, cmd.UserId), ct);
            await mediator.Publish(new TaskAssignedEvent(cmd.TaskId, cmd.UserId, task.Title), ct);
        }

        await recommendationRepo.RecordDecisionAsync(cmd.TaskId, cmd.UserId, true, currentUser.UserId, cmd.Outcome, ct);
        return true;
    }
}

public sealed record RejectAssignmentRecommendationCommand(
    int TaskId,
    int UserId,
    string? Reason = null
) : IRequest<bool>;

public sealed class RejectAssignmentRecommendationCommandHandler(
    ICurrentUser currentUser,
    IResourceAuthorizationService authz,
    IAiRecommendationRepository recommendationRepo
) : IRequestHandler<RejectAssignmentRecommendationCommand, bool>
{
    public async Task<bool> Handle(RejectAssignmentRecommendationCommand cmd, CancellationToken ct)
    {
        await authz.EnsureCanManageTaskAsync(cmd.TaskId, ct);

        await recommendationRepo.RecordDecisionAsync(cmd.TaskId, cmd.UserId, false, currentUser.UserId, cmd.Reason, ct);
        return true;
    }
}
