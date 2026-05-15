using MediatR;
using TaskGenie.Application.Features.Organizations.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Organizations.Queries;

public sealed record GetProjectEvaluationQuery(int ProjectId) : IRequest<ProjectEvaluationDto?>;

public sealed class GetProjectEvaluationQueryHandler(
    IProjectEvaluationRepository evaluationRepo
) : IRequestHandler<GetProjectEvaluationQuery, ProjectEvaluationDto?>
{
    public async Task<ProjectEvaluationDto?> Handle(GetProjectEvaluationQuery query, CancellationToken ct)
    {
        var eval = await evaluationRepo.GetByProjectIdAsync(query.ProjectId, ct);
        return eval is not null ? ProjectEvaluationDto.FromEntity(eval) : null;
    }
}
