using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Evaluations;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Evaluations.Commands;

public class CreateEvaluationCommandHandler(
    ICurrentUser currentUser,
    IEvaluationRepository evaluationRepository)
    : IRequestHandler<CreateEvaluationCommand, EvaluationDto>
{
    public async Task<EvaluationDto> Handle(CreateEvaluationCommand request, CancellationToken ct)
    {
        // The leader is the actor. Previously LeaderId came from the request body, so anyone
        // could file a performance review in another leader's name.
        if (request.UserId == currentUser.UserId)
            throw new ForbiddenException("You cannot evaluate yourself.");

        var evaluation = Evaluation.Create(
            request.UserId,
            currentUser.UserId,
            request.SkillScore,
            request.TeamworkScore,
            request.DeadlineScore,
            request.CommunicationScore);

        await evaluationRepository.AddAsync(evaluation, ct);

        var created = await evaluationRepository.GetByIdAsync(evaluation.EvaluationId, ct)
            ?? throw new NotFoundException(nameof(Evaluation), evaluation.EvaluationId);

        return new EvaluationDto
        {
            EvaluationId = created.EvaluationId,
            UserId = created.UserId ?? 0,
            UserName = created.User?.Name,
            LeaderId = created.LeaderId,
            LeaderName = created.Leader?.Name,
            SkillScore = created.SkillScore,
            TeamworkScore = created.TeamworkScore,
            DeadlineScore = created.DeadlineScore,
            CommunicationScore = created.CommunicationScore,
            CreatedAt = created.CreatedAt
        };
    }
}
