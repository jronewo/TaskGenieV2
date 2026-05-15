using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Evaluations.Commands;

public class DeleteEvaluationCommandHandler(IEvaluationRepository evaluationRepository)
    : IRequestHandler<DeleteEvaluationCommand, bool>
{
    public async Task<bool> Handle(DeleteEvaluationCommand request, CancellationToken ct)
    {
        var evaluation = await evaluationRepository.GetByIdAsync(request.EvaluationId, ct)
            ?? throw new NotFoundException("Evaluation", request.EvaluationId);

        await evaluationRepository.DeleteAsync(request.EvaluationId, ct);
        return true;
    }
}
