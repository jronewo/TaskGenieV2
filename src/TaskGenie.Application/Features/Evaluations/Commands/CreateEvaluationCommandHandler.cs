using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Evaluations;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Evaluations.Commands;

public class CreateEvaluationCommandHandler(IEvaluationRepository evaluationRepository)
    : IRequestHandler<CreateEvaluationCommand, EvaluationDto>
{
    public async Task<EvaluationDto> Handle(CreateEvaluationCommand request, CancellationToken ct)
    {
        var evaluation = Evaluation.Create(
            request.UserId,
            request.LeaderId,
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
