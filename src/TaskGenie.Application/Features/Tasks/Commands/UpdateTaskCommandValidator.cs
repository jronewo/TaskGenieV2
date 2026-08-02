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
    }
}
