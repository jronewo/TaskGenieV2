using FluentValidation;

namespace TaskGenie.Application.Features.Projects.Commands;

public sealed class CreateProjectCommandValidator : AbstractValidator<CreateProjectCommand>
{
    public CreateProjectCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Project name is required.");

        // A project whose deadline is already in the past can never be delivered on time — reject it
        // at creation rather than opening a board that is overdue from the first day. Only checked
        // when a deadline was actually supplied; a project without one is left alone.
        RuleFor(x => x.Deadline)
            .Must(BeTodayOrLater)
            .When(x => x.Deadline.HasValue)
            .WithMessage("Project deadline cannot be in the past.");
    }

    internal static bool BeTodayOrLater(DateOnly? deadline) =>
        deadline is null || deadline.Value >= DateOnly.FromDateTime(DateTime.UtcNow);
}
