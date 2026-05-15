using MediatR;
using TaskGenie.Application.Features.Evaluations;

namespace TaskGenie.Application.Features.Evaluations.Commands;

public record CreateEvaluationCommand(
    int UserId,
    int LeaderId,
    int? SkillScore,
    int? TeamworkScore,
    int? DeadlineScore,
    int? CommunicationScore) : IRequest<EvaluationDto>;
