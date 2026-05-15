using MediatR;
using TaskGenie.Application.Features.Evaluations;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Evaluations.Queries;

public class GetLeaderEvaluationsQueryHandler(IEvaluationRepository evaluationRepository)
    : IRequestHandler<GetLeaderEvaluationsQuery, List<EvaluationDto>>
{
    public async Task<List<EvaluationDto>> Handle(GetLeaderEvaluationsQuery request, CancellationToken ct)
    {
        var evaluations = await evaluationRepository.GetByLeaderIdAsync(request.LeaderId, ct);
        return evaluations.Select(e => new EvaluationDto
        {
            EvaluationId = e.EvaluationId,
            UserId = e.UserId ?? 0,
            UserName = e.User?.Name,
            LeaderId = e.LeaderId,
            LeaderName = e.Leader?.Name,
            SkillScore = e.SkillScore,
            TeamworkScore = e.TeamworkScore,
            DeadlineScore = e.DeadlineScore,
            CommunicationScore = e.CommunicationScore,
            CreatedAt = e.CreatedAt
        }).ToList();
    }
}
