using MediatR;
using TaskGenie.Application.Features.Projects.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Projects.Queries;

/// <summary>
/// The caller's projects, split by whether they have been closed.
///
/// A closed project is finished work, not a workspace: left in, it would keep occupying the
/// sidebar, the board switcher and the dashboard grid forever. It stays fully readable through
/// <c>Closed = true</c>, which is what the profile's finished-projects list asks for.
/// </summary>
public sealed record GetProjectsByUserQuery(int UserId, bool Closed = false) : IRequest<List<ProjectDto>>;

public sealed class GetProjectsByUserQueryHandler(
    IProjectRepository projectRepo
) : IRequestHandler<GetProjectsByUserQuery, List<ProjectDto>>
{
    public async Task<List<ProjectDto>> Handle(GetProjectsByUserQuery query, CancellationToken ct)
    {
        var projects = await projectRepo.GetProjectsByUserIdAsync(query.UserId, ct);
        return projects
            .Where(p => p.IsClosed == query.Closed)
            .Select(ProjectDto.FromEntity)
            .ToList();
    }
}
