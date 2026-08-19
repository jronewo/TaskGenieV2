using FluentValidation;

namespace TaskGenie.Application.Features.Teams.Commands;

public sealed class AddTeamMemberCommandValidator : AbstractValidator<AddTeamMemberCommand>
{
    private static readonly string[] AllowedRoles = ["MEMBER", "LEADER"];

    public AddTeamMemberCommandValidator()
    {
        RuleFor(x => x.Role)
            .NotEmpty()
            .Must(role => AllowedRoles.Contains(role?.ToUpperInvariant()))
            .WithMessage($"Role must be one of: {string.Join(", ", AllowedRoles)}.");
    }
}
