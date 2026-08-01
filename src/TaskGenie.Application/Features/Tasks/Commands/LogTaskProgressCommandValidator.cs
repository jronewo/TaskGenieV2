using FluentValidation;

namespace TaskGenie.Application.Features.Tasks.Commands;

public sealed class LogTaskProgressCommandValidator : AbstractValidator<LogTaskProgressCommand>
{
    public LogTaskProgressCommandValidator()
    {
        RuleFor(x => x.Progress).InclusiveBetween(0, 100);
    }
}
