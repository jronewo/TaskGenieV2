using MediatR;
using TaskGenie.Application.Features.Evaluations;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Evaluations.Queries;

public class GetUserEvaluationsQueryHandler(
    IResourceAuthorizationService authorization,
    IEvaluationRepository evaluationRepository)
    : IRequestHandler<GetUserEvaluationsQuery, List<EvaluationDto>>
{
    public async Task<List<EvaluationDto>> Handle(GetUserEvaluationsQuery request, CancellationToken ct)
    {
        // A leader needs a member's history to write a fair review; everyone else is refused.
        await authorization.EnsureCanViewUserPerformanceAsync(request.UserId, ct);

        var evaluations = await evaluationRepository.GetByUserIdAsync(request.UserId, ct);
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
