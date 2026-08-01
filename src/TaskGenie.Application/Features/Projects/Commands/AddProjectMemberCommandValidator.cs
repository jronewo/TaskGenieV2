using FluentValidation;

namespace TaskGenie.Application.Features.Projects.Commands;

public sealed class AddProjectMemberCommandValidator : AbstractValidator<AddProjectMemberCommand>
{
    private static readonly string[] AllowedRoles = ["MEMBER", "LEADER"];

    public AddProjectMemberCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Role)
            .NotEmpty()
            .Must(role => AllowedRoles.Contains(role?.ToUpperInvariant()))
            .WithMessage($"Role must be one of: {string.Join(", ", AllowedRoles)}.");
    }
}
