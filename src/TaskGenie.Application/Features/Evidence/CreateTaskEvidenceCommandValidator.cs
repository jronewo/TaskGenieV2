using FluentValidation;

namespace TaskGenie.Application.Features.Evidence;

public sealed class CreateTaskEvidenceCommandValidator : AbstractValidator<CreateTaskEvidenceCommand>
{
    public CreateTaskEvidenceCommandValidator()
    {
        RuleFor(command => command.TaskId).GreaterThan(0);
        RuleFor(command => command.SubmittedBy).GreaterThan(0).WithMessage("X-User-Id header is required.");
        RuleFor(command => command.EvidenceType).NotEmpty().MaximumLength(50);
        RuleFor(command => command.Description).MaximumLength(1000);
        RuleFor(command => command.ExternalUrl)
            .Must(BeHttpUrl)
            .When(command => !string.IsNullOrWhiteSpace(command.ExternalUrl))
            .WithMessage("ExternalUrl must be an absolute HTTP or HTTPS URL.");
        RuleFor(command => command)
            .Must(command => !string.IsNullOrWhiteSpace(command.ExternalUrl) || !string.IsNullOrWhiteSpace(command.StorageUrl))
            .WithMessage("Either ExternalUrl or StorageUrl is required.");
        RuleFor(command => command.SizeBytes)
            .LessThanOrEqualTo(25L * 1024 * 1024)
            .When(command => command.SizeBytes.HasValue);
    }

    private static bool BeHttpUrl(string? value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri) &&
        (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
}
