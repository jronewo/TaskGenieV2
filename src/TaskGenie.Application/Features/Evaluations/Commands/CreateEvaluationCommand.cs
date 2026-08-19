using MediatR;
using TaskGenie.Application.Features.Evaluations;

namespace TaskGenie.Application.Features.Evaluations.Commands;

/// <summary>The evaluating leader is always the authenticated actor — never supplied by the client.</summary>
public record CreateEvaluationCommand(
    int UserId,
    int? SkillScore,
    int? TeamworkScore,
    int? DeadlineScore,
    int? CommunicationScore) : IRequest<EvaluationDto>;
