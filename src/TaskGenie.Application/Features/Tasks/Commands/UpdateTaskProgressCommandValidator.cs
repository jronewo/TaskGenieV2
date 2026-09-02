using FluentValidation;
using TaskGenie.Domain.Entities;

namespace TaskGenie.Application.Features.Tasks.Commands;

public sealed class UpdateTaskProgressCommandValidator : AbstractValidator<UpdateTaskProgressCommand>
{
    public UpdateTaskProgressCommandValidator()
    {
        RuleFor(x => x.Progress!.Value)
            .InclusiveBetween(0, 100)
            .When(x => x.Progress.HasValue);

        // Nothing checked this before, so any string became a status and dropped the task out of
        // every board column.
        RuleFor(x => x.Status)
            .Must(TaskStatuses.IsValid)
            .When(x => x.Status is not null)
            .WithMessage($"Status must be one of: {string.Join(", ", TaskStatuses.All)}.");

        // Backlog only exists because of a bug — without a reason it's indistinguishable from any
        // other status move, and nobody downstream would know why the task bounced back.
        RuleFor(x => x.Reason)
            .NotEmpty()
            .When(x => x.Status == TaskStatuses.Backlog)
            .WithMessage("A reason is required when moving a task to Backlog.");
    }
}
