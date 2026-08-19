using MediatR;
using Microsoft.Extensions.Logging;
using TaskGenie.Application.Events;
using TaskGenie.Application.Features.Tasks.Commands;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Application.Features.Tasks.EventHandlers;

/// <summary>
/// Estimates every task the moment it is created, including each row of a spreadsheet import.
///
/// Difficulty and estimated hours feed the risk engine's capacity and escalation rules, so a task
/// with neither is invisible to them. Waiting for someone to press "Auto estimate" meant that in
/// practice almost nothing was ever estimated. The result is a starting point, not a verdict — the
/// same button re-runs it, and a difficulty a person sets is never overwritten.
/// </summary>
public sealed class EstimateNewTaskHandler(
    IMediator mediator,
    ILogger<EstimateNewTaskHandler> logger
) : INotificationHandler<TaskCreatedEvent>
{
    public async Task Handle(TaskCreatedEvent notification, CancellationToken ct)
    {
        try
        {
            await mediator.Send(new SuggestEstimatedTimeCommand(notification.TaskId), ct);
        }
        catch (Exception ex)
        {
            // An unavailable model must never fail the creation itself — the task exists either way
            // and the estimate can be run again by hand.
            logger.LogWarning(ex, "Could not auto-estimate task {TaskId}.", notification.TaskId);
        }
    }
}
