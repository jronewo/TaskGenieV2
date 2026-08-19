using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Organizations.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Organizations.Queries;

public sealed record GetProjectEvaluationQuery(int OrganizationId, int ProjectId) : IRequest<ProjectEvaluationDto?>;

public sealed class GetProjectEvaluationQueryHandler(
    IResourceAuthorizationService authorization,
    IProjectRepository projectRepo,
    IProjectEvaluationRepository evaluationRepo
) : IRequestHandler<GetProjectEvaluationQuery, ProjectEvaluationDto?>
{
    public async Task<ProjectEvaluationDto?> Handle(GetProjectEvaluationQuery query, CancellationToken ct)
    {
        await authorization.EnsureCanAccessOrganizationAsync(query.OrganizationId, ct);

        // The project must actually belong to the organization in the route — otherwise an
        // organization owner could read another organization's evaluation by guessing a
        // ProjectId, even though they can't reach it through GetOrganizationProjectsQuery.
        var project = await projectRepo.GetByIdAsync(query.ProjectId, ct);
        if (project is null || project.OrganizationId != query.OrganizationId)
            throw new NotFoundException("Project", query.ProjectId);

        var eval = await evaluationRepo.GetByProjectIdAsync(query.ProjectId, ct);
        return eval is not null ? ProjectEvaluationDto.FromEntity(eval) : null;
    }
}
