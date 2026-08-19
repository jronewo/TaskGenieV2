using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Evaluations.Commands;

public class DeleteEvaluationCommandHandler(
    ICurrentUser currentUser,
    IEvaluationRepository evaluationRepository)
    : IRequestHandler<DeleteEvaluationCommand, bool>
{
    public async Task<bool> Handle(DeleteEvaluationCommand request, CancellationToken ct)
    {
        var evaluation = await evaluationRepository.GetByIdAsync(request.EvaluationId, ct)
            ?? throw new NotFoundException("Evaluation", request.EvaluationId);

        // Only the leader who wrote the review (or an admin) may retract it.
        if (evaluation.LeaderId != currentUser.UserId && !currentUser.IsPlatformAdmin)
            throw new ForbiddenException("Only the evaluating leader can delete this evaluation.");

        await evaluationRepository.DeleteAsync(request.EvaluationId, ct);
        return true;
    }
}
