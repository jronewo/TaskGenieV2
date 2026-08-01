using MediatR;
using TaskGenie.Application.Features.AI.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.AI.Queries;

public sealed record GetTaskAnalysesQuery(int TaskId) : IRequest<List<AiAnalysisDto>>;

public sealed class GetTaskAnalysesQueryHandler(
    IResourceAuthorizationService authz,
    IAiAnalysisRepository aiAnalysisRepo
) : IRequestHandler<GetTaskAnalysesQuery, List<AiAnalysisDto>>
{
    public async Task<List<AiAnalysisDto>> Handle(GetTaskAnalysesQuery query, CancellationToken ct)
    {
        await authz.EnsureCanAccessTaskAsync(query.TaskId, ct);

        var analyses = await aiAnalysisRepo.GetByTaskIdAsync(query.TaskId, ct);
        return analyses.Select(AiAnalysisDto.FromEntity).ToList();
    }
}
