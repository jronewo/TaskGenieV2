using MediatR;

namespace TaskGenie.Application.Features.Evaluations.Commands;

public record DeleteEvaluationCommand(int EvaluationId) : IRequest<bool>;
