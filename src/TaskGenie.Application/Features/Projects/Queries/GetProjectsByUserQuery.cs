using MediatR;
using TaskGenie.Application.Features.Projects.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Projects.Queries;

public sealed record GetProjectsByUserQuery(int UserId) : IRequest<List<ProjectDto>>;

public sealed class GetProjectsByUserQueryHandler(
    IProjectRepository projectRepo
) : IRequestHandler<GetProjectsByUserQuery, List<ProjectDto>>
{
    public async Task<List<ProjectDto>> Handle(GetProjectsByUserQuery query, CancellationToken ct)
    {
        var projects = await projectRepo.GetProjectsByUserIdAsync(query.UserId, ct);
        return projects.Select(ProjectDto.FromEntity).ToList();
    }
}
