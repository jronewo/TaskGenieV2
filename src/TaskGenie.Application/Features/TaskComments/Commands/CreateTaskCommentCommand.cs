using FluentValidation;
using MediatR;
using TaskGenie.Application.Features.TaskComments;

namespace TaskGenie.Application.Features.TaskComments.Commands;

public record CreateTaskCommentCommand(
    int TaskId,
    string? Content,
    string? ImageUrl) : IRequest<TaskCommentDto>;

/// <summary>
/// A comment carries either text or an image — an empty one is a stray submit, and it would render
/// as a blank row nobody can delete meaningfully.
/// </summary>
public sealed class CreateTaskCommentCommandValidator : AbstractValidator<CreateTaskCommentCommand>
{
    public CreateTaskCommentCommandValidator()
    {
        RuleFor(c => c.TaskId).GreaterThan(0);

        RuleFor(c => c)
            .Must(c => !string.IsNullOrWhiteSpace(c.Content) || !string.IsNullOrWhiteSpace(c.ImageUrl))
            .WithMessage("A comment needs text or an image.");

        RuleFor(c => c.Content).MaximumLength(2000);
    }
}
