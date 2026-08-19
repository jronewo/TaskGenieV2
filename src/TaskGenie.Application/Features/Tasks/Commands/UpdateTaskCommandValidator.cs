using FluentValidation;
using TaskGenie.Domain.Entities;

namespace TaskGenie.Application.Features.Tasks.Commands;

/// <summary>
/// The task edit form writes status too, so it needs the same allowlist the board's drag-and-drop
/// path uses — otherwise the two write paths disagree about what a status is.
/// </summary>
public sealed class UpdateTaskCommandValidator : AbstractValidator<UpdateTaskCommand>
{
    public UpdateTaskCommandValidator()
    {
        RuleFor(x => x.Status)
            .Must(TaskStatuses.IsValid)
            .When(x => x.Status is not null)
            .WithMessage($"Status must be one of: {string.Join(", ", TaskStatuses.All)}.");

        // Only refuses when both dates are present in this same payload and out of order — a
        // partial update touching just one of the two isn't cross-checked against the persisted
        // value of the other.
        RuleFor(x => x)
            .Must(HaveValidDateOrder)
            .WithMessage("Start date must be on or before the deadline.");
    }

    private static bool HaveValidDateOrder(UpdateTaskCommand cmd)
    {
        if (!DateOnly.TryParse(cmd.StartDate, out var start)) return true;
        if (!DateOnly.TryParse(cmd.Deadline, out var deadline)) return true;
        return start <= deadline;
    }
}
