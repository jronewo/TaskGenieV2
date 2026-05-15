using MediatR;
using TaskGenie.Application.Features.Evaluations;

namespace TaskGenie.Application.Features.Evaluations.Queries;

public record GetUserEvaluationsQuery(int UserId) : IRequest<List<EvaluationDto>>;
