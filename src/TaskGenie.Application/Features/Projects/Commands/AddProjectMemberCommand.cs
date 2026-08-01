using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Projects.Commands;

public sealed record AddProjectMemberCommand(
    int ProjectId,
    string Email,
    string Role
) : IRequest<bool>;

public sealed class AddProjectMemberCommandHandler(
    ICurrentUser currentUser,
    IResourceAuthorizationService authz,
    IProjectRepository projectRepo,
    IUserRepository userRepo,
    ITeamRepository teamRepo,
    ITeamMemberRepository teamMemberRepo
) : IRequestHandler<AddProjectMemberCommand, bool>
{
    public async Task<bool> Handle(AddProjectMemberCommand cmd, CancellationToken ct)
    {
        var project = await authz.EnsureCanManageProjectAsync(cmd.ProjectId, ct);

        var user = await userRepo.GetByEmailAsync(cmd.Email, ct)
            ?? throw new NotFoundException("User", cmd.Email);

        // Ensure project has a team; create one if needed. The team is owned by the actor
        // performing the mutation (already verified above), never by the user being added.
        if (project.TeamId is null or 0)
        {
            var newTeam = Team.Create(
                name: $"Team Project: {project.Name}",
                description: $"Team for project {project.Name}",
                createdBy: currentUser.UserId,
                isProjectManaged: true
            );
            await teamRepo.AddAsync(newTeam, ct);
            project.SetTeamId(newTeam.TeamId);
            await projectRepo.UpdateAsync(project, ct);
        }

        // Check if already a member
        var existingMembers = await teamMemberRepo.GetByTeamIdAsync(project.TeamId!.Value, ct);
        if (existingMembers.Any(m => m.UserId == user.UserId)) return true;

        var member = TeamMember.Create(project.TeamId.Value, user.UserId, cmd.Role.ToUpperInvariant());
        await teamMemberRepo.AddAsync(member, ct);
        return true;
    }
}
