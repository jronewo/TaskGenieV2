using FluentValidation;
using TaskGenie.Application.Features.AI.Commands;

namespace TaskGenie.Application.Features.AI;

public sealed class AnalyzeTaskRiskCommandValidator : AbstractValidator<AnalyzeTaskRiskCommand>
{
    public AnalyzeTaskRiskCommandValidator() => RuleFor(command => command.TaskId).GreaterThan(0);
}

public sealed class GetAssignmentRecommendationsCommandValidator : AbstractValidator<GetAssignmentRecommendationsCommand>
{
    public GetAssignmentRecommendationsCommandValidator()
    {
        RuleFor(command => command.TaskId).GreaterThan(0);
        RuleFor(command => command.ProjectId).GreaterThan(0);
    }
}

public sealed class AcceptAssignmentRecommendationCommandValidator : AbstractValidator<AcceptAssignmentRecommendationCommand>
{
    public AcceptAssignmentRecommendationCommandValidator()
    {
        RuleFor(command => command.TaskId).GreaterThan(0);
        RuleFor(command => command.UserId).GreaterThan(0);
    }
}

public sealed class RejectAssignmentRecommendationCommandValidator : AbstractValidator<RejectAssignmentRecommendationCommand>
{
    public RejectAssignmentRecommendationCommandValidator()
    {
        RuleFor(command => command.TaskId).GreaterThan(0);
        RuleFor(command => command.UserId).GreaterThan(0);
        RuleFor(command => command.Reason).MaximumLength(1000);
    }
}
