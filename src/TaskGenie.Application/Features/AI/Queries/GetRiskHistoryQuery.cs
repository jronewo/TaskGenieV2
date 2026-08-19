using MediatR;
using TaskGenie.Application.Features.AI.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.AI.Queries;

public sealed record GetRiskHistoryQuery(int TaskId) : IRequest<List<RiskAssessmentDto>>;

public sealed class GetRiskHistoryQueryHandler(IResourceAuthorizationService authz, IRiskRepository riskRepository)
    : IRequestHandler<GetRiskHistoryQuery, List<RiskAssessmentDto>>
{
    public async Task<List<RiskAssessmentDto>> Handle(GetRiskHistoryQuery query, CancellationToken ct)
    {
        await authz.EnsureCanAccessTaskAsync(query.TaskId, ct);

        var history = await riskRepository.GetHistoryByTaskIdAsync(query.TaskId, ct);
        return history.Select(RiskAssessmentDto.FromEntity).ToList();
    }
}
