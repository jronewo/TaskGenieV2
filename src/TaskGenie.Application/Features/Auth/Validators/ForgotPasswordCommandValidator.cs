using FluentValidation;
using TaskGenie.Application.Features.Auth.Commands;

namespace TaskGenie.Application.Features.Auth.Validators;

public class ForgotPasswordCommandValidator : AbstractValidator<ForgotPasswordCommand>
{
    public ForgotPasswordCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
    }
}
