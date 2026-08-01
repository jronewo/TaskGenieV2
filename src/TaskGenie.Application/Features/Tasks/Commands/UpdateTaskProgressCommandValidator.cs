using FluentValidation;

namespace TaskGenie.Application.Features.Tasks.Commands;

public sealed class UpdateTaskProgressCommandValidator : AbstractValidator<UpdateTaskProgressCommand>
{
    public UpdateTaskProgressCommandValidator()
    {
        RuleFor(x => x.Progress!.Value)
            .InclusiveBetween(0, 100)
            .When(x => x.Progress.HasValue);
    }
}
