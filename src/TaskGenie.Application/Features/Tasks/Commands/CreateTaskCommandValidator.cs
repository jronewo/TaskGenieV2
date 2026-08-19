using FluentValidation;

namespace TaskGenie.Application.Features.Tasks.Commands;

public sealed class CreateTaskCommandValidator : AbstractValidator<CreateTaskCommand>
{
    public CreateTaskCommandValidator()
    {
        RuleFor(x => x)
            .Must(HaveValidDateOrder)
            .WithMessage("Start date must be on or before the deadline.");
    }

    /// <summary>Only refuses when both dates are present and out of order — a task can freely have
    /// just one of the two set.</summary>
    internal static bool HaveValidDateOrder(CreateTaskCommand cmd)
    {
        if (!DateOnly.TryParse(cmd.StartDate, out var start)) return true;
        if (!DateOnly.TryParse(cmd.Deadline, out var deadline)) return true;
        return start <= deadline;
    }
}
