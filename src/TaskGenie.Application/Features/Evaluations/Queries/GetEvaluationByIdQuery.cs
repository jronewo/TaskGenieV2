using MediatR;
using TaskGenie.Application.Features.Evaluations;

namespace TaskGenie.Application.Features.Evaluations.Queries;

public record GetEvaluationByIdQuery(int EvaluationId) : IRequest<EvaluationDto?>;
