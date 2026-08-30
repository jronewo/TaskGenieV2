using FluentValidation;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Tasks.Commands;

/// <summary>
/// The task edit form writes status too, so it needs the same allowlist the board's drag-and-drop
/// path uses — otherwise the two write paths disagree about what a status is.
/// </summary>
public sealed class UpdateTaskCommandValidator : AbstractValidator<UpdateTaskCommand>
{
    public UpdateTaskCommandValidator(ITaskRepository taskRepo, IProjectRepository projectRepo)
    {
        RuleFor(x => x.Status)
            .Must(TaskStatuses.IsValid)
            .When(x => x.Status is not null)
            .WithMessage($"Status must be one of: {string.Join(", ", TaskStatuses.All)}.");

        // A partial update can touch just one date and leave the other on its persisted value, so
        // a date this payload sets is checked against the *effective* task — the stored value fills
        // in whichever side the payload leaves alone. That closes the gap where moving only the
        // start date past an untouched deadline (or the project's deadline) slipped through.
        //
        // A check only fires when this payload actually carries one of the dates it compares:
        // a rename-only edit is never blocked because data set before this rule existed is stale.
        RuleFor(x => x).CustomAsync(async (cmd, context, ct) =>
        {
            var payloadStart = ParseDate(cmd.StartDate);
            var payloadDeadline = ParseDate(cmd.Deadline);
            if (payloadStart is null && payloadDeadline is null) return;

            var (start, deadline, projectDeadline) = await ResolveEffectiveDatesAsync(
                cmd, payloadStart, payloadDeadline, taskRepo, projectRepo, ct);

            if (start is { } s && deadline is { } d && s > d)
                context.AddFailure("Start date must be on or before the deadline.");

            if (projectDeadline is { } pd)
            {
                if (payloadDeadline is { } newDeadline && newDeadline > pd)
                    context.AddFailure("Task deadline cannot be later than the project's deadline.");

                if (payloadStart is { } newStart && newStart > pd)
                    context.AddFailure("Task start date cannot be later than the project's deadline.");
            }
        });
    }

    private static DateOnly? ParseDate(string? value) =>
        DateOnly.TryParse(value, out var parsed) ? parsed : null;

    private static async Task<(DateOnly? Start, DateOnly? Deadline, DateOnly? ProjectDeadline)> ResolveEffectiveDatesAsync(
        UpdateTaskCommand cmd, DateOnly? payloadStart, DateOnly? payloadDeadline,
        ITaskRepository taskRepo, IProjectRepository projectRepo, CancellationToken ct)
    {
        var task = await taskRepo.GetByIdAsync(cmd.TaskId, ct);

        var start = payloadStart ?? task?.StartDate;
        var deadline = payloadDeadline ?? task?.Deadline;

        DateOnly? projectDeadline = null;
        if (task?.ProjectId is { } projectId)
        {
            var project = await projectRepo.GetByIdAsync(projectId, ct);
            projectDeadline = project?.Deadline;
        }

        return (start, deadline, projectDeadline);
    }
}
