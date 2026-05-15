using MediatR;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Projects.Commands;

public sealed record AddProjectMemberCommand(
    int ProjectId,
    string Email,
    string Role
) : IRequest<bool>;

public sealed class AddProjectMemberCommandHandler(
    IProjectRepository projectRepo,
    IUserRepository userRepo,
    ITeamRepository teamRepo,
    ITeamMemberRepository teamMemberRepo
) : IRequestHandler<AddProjectMemberCommand, bool>
{
    public async Task<bool> Handle(AddProjectMemberCommand cmd, CancellationToken ct)
    {
        var project = await projectRepo.GetByIdAsync(cmd.ProjectId, ct);
        if (project is null) return false;

        var user = await userRepo.GetByEmailAsync(cmd.Email, ct);
        if (user is null) return false;

        // Ensure project has a team; create one if needed
        if (project.TeamId is null or 0)
        {
            var newTeam = Team.Create(
                name: $"Team Project: {project.Name}",
                description: $"Team for project {project.Name}",
                createdBy: user.UserId
            );
            await teamRepo.AddAsync(newTeam, ct);
            project.SetTeamId(newTeam.TeamId);
            await projectRepo.UpdateAsync(project, ct);
        }

        // Check if already a member
        var existingMembers = await teamMemberRepo.GetByTeamIdAsync(project.TeamId!.Value, ct);
        if (existingMembers.Any(m => m.UserId == user.UserId)) return true;

        var member = TeamMember.Create(project.TeamId.Value, user.UserId, cmd.Role ?? "MEMBER");
        await teamMemberRepo.AddAsync(member, ct);
        return true;
    }
}
