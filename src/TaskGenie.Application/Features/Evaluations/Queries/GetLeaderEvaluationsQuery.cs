using MediatR;
using TaskGenie.Application.Features.Evaluations;

namespace TaskGenie.Application.Features.Evaluations.Queries;

public record GetLeaderEvaluationsQuery(int LeaderId) : IRequest<List<EvaluationDto>>;
