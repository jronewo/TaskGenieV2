using MediatR;
using TaskGenie.Application.Events;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Application.Common.Exceptions;

namespace TaskGenie.Application.Features.AI.Commands;

public sealed record AcceptAssignmentRecommendationCommand(
    int TaskId,
    int UserId,
    int? DecidedBy = null,
    string? Outcome = null
) : IRequest<bool>;

public sealed class AcceptAssignmentRecommendationCommandHandler(
    ITaskRepository taskRepo,
    IAiRecommendationRepository recommendationRepo,
    IMediator mediator
) : IRequestHandler<AcceptAssignmentRecommendationCommand, bool>
{
    public async Task<bool> Handle(AcceptAssignmentRecommendationCommand cmd, CancellationToken ct)
    {
        var task = await taskRepo.GetByIdAsync(cmd.TaskId, ct)
            ?? throw new NotFoundException("Task", cmd.TaskId);
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

        await recommendationRepo.RecordDecisionAsync(cmd.TaskId, cmd.UserId, true, cmd.DecidedBy, cmd.Outcome, ct);
        return true;
    }
}

public sealed record RejectAssignmentRecommendationCommand(
    int TaskId,
    int UserId,
    int? DecidedBy = null,
    string? Outcome = null
) : IRequest<bool>;

public sealed class RejectAssignmentRecommendationCommandHandler(IAiRecommendationRepository recommendationRepo)
    : IRequestHandler<RejectAssignmentRecommendationCommand, bool>
{
    public async Task<bool> Handle(RejectAssignmentRecommendationCommand cmd, CancellationToken ct)
    {
        await recommendationRepo.RecordDecisionAsync(cmd.TaskId, cmd.UserId, false, cmd.DecidedBy, cmd.Outcome, ct);
        return true;
    }
}
