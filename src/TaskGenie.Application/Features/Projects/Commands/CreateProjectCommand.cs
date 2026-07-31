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
    DateOnly? Deadline,
    string ProjectType = "Team"
) : IRequest<ProjectDto>;

public sealed class CreateProjectCommandHandler(
    IProjectRepository projectRepo,
    ITeamRepository teamRepo,
    ITeamMemberRepository teamMemberRepo
) : IRequestHandler<CreateProjectCommand, ProjectDto>
{
    public async Task<ProjectDto> Handle(CreateProjectCommand cmd, CancellationToken ct)
    {
        var projectType = cmd.ProjectType is "Personal" or "Team" ? cmd.ProjectType : "Team";

        // Create a 1:1 mapped Team for this Project
        var team = Team.Create(
            name: projectType == "Personal"
                ? $"Personal: {cmd.Name}"
                : $"Team Project: {cmd.Name}",
            description: projectType == "Personal"
                ? $"Personal workspace for {cmd.Name}"
                : $"Team for project {cmd.Name}",
            createdBy: cmd.CreatedBy
        );
        await teamRepo.AddAsync(team, ct);

        // Creator is always LEADER (owner of personal or team project)
        var leaderMember = TeamMember.Create(team.TeamId, cmd.CreatedBy, "LEADER");
        await teamMemberRepo.AddAsync(leaderMember, ct);

        var project = Project.Create(
            name: cmd.Name,
            description: cmd.Description,
            createdBy: cmd.CreatedBy,
            organizationId: cmd.OrganizationId,
            deadline: cmd.Deadline,
            projectType: projectType
        );
        project.SetTeamId(team.TeamId);

        await projectRepo.AddAsync(project, ct);

        var created = await projectRepo.GetByIdAsync(project.ProjectId, ct);
        return ProjectDto.FromEntity(created!);
    }
}
