using MediatR;
using TaskGenie.Application.Features.Projects.DTOs;
using TaskGenie.Application.Interfaces;

namespace TaskGenie.Application.Features.Projects.Queries;

public sealed record GetProjectByIdQuery(int ProjectId) : IRequest<ProjectDto?>;

public sealed class GetProjectByIdQueryHandler(
    IResourceAuthorizationService authz
) : IRequestHandler<GetProjectByIdQuery, ProjectDto?>
{
    public async Task<ProjectDto?> Handle(GetProjectByIdQuery query, CancellationToken ct)
    {
        var project = await authz.EnsureCanAccessProjectAsync(query.ProjectId, ct);
        return ProjectDto.FromEntity(project);
    }
}
