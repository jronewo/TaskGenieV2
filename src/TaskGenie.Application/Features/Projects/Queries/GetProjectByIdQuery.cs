using MediatR;
using TaskGenie.Application.Features.Projects.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Projects.Queries;

public sealed record GetProjectByIdQuery(int ProjectId) : IRequest<ProjectDto?>;

public sealed class GetProjectByIdQueryHandler(
    IProjectRepository projectRepo
) : IRequestHandler<GetProjectByIdQuery, ProjectDto?>
{
    public async Task<ProjectDto?> Handle(GetProjectByIdQuery query, CancellationToken ct)
    {
        var project = await projectRepo.GetByIdAsync(query.ProjectId, ct);
        return project is not null ? ProjectDto.FromEntity(project) : null;
    }
}
