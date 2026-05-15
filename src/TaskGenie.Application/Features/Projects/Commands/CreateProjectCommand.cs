using MediatR;
using TaskGenie.Application.Features.Projects.DTOs;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Projects.Commands;

public sealed record CreateProjectCommand(
    string Name,
    string? Description,
    int CreatedBy,
    int? OrganizationId,
    DateOnly? Deadline
) : IRequest<ProjectDto>;

public sealed class CreateProjectCommandHandler(
    IProjectRepository projectRepo,
    ITeamRepository teamRepo,
    ITeamMemberRepository teamMemberRepo
) : IRequestHandler<CreateProjectCommand, ProjectDto>
{
    public async Task<ProjectDto> Handle(CreateProjectCommand cmd, CancellationToken ct)
    {
        // Create a 1:1 mapped Team for this Project
        var team = Team.Create(
            name: $"Team Project: {cmd.Name}",
            description: $"Team for project {cmd.Name}",
            createdBy: cmd.CreatedBy
        );
        await teamRepo.AddAsync(team, ct);

        // Add creator as LEADER
        var leaderMember = TeamMember.Create(team.TeamId, cmd.CreatedBy, "LEADER");
        await teamMemberRepo.AddAsync(leaderMember, ct);

        // Create the project
        var project = Project.Create(
            name: cmd.Name,
            description: cmd.Description,
            createdBy: cmd.CreatedBy,
            organizationId: cmd.OrganizationId,
            deadline: cmd.Deadline
        );
        project.SetTeamId(team.TeamId);

        await projectRepo.AddAsync(project, ct);

        var created = await projectRepo.GetByIdAsync(project.ProjectId, ct);
        return ProjectDto.FromEntity(created!);
    }
}
