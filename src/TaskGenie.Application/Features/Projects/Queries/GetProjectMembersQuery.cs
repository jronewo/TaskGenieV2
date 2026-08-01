using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Teams.DTOs;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Projects.Queries;

/// <summary>Lists the members of the project's underlying 1:1 team.</summary>
public sealed record GetProjectMembersQuery(int ProjectId) : IRequest<List<TeamMemberDto>>;

public sealed class GetProjectMembersQueryHandler(
    IProjectRepository projectRepo,
    ITeamMemberRepository teamMemberRepo
) : IRequestHandler<GetProjectMembersQuery, List<TeamMemberDto>>
{
    public async Task<List<TeamMemberDto>> Handle(GetProjectMembersQuery query, CancellationToken ct)
    {
        var project = await projectRepo.GetByIdAsync(query.ProjectId, ct)
            ?? throw new NotFoundException(nameof(Project), query.ProjectId);

        // No team yet (e.g. never had a member added) — nothing to list.
        if (project.TeamId is null or 0)
            return [];

        var members = await teamMemberRepo.GetByTeamIdAsync(project.TeamId.Value, ct);
        return members.Select(tm => new TeamMemberDto
        {
            Id = tm.Id,
            TeamId = tm.TeamId ?? 0,
            UserId = tm.UserId ?? 0,
            UserName = tm.User?.Name,
            UserEmail = tm.User?.Email,
            Role = tm.Role
        }).ToList();
    }
}
