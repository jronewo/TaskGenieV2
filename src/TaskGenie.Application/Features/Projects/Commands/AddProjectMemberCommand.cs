using MediatR;
using TaskGenie.Application.Common.Exceptions;
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
        var project = await projectRepo.GetByIdAsync(cmd.ProjectId, ct)
            ?? throw new NotFoundException(nameof(Project), cmd.ProjectId);

        // Fails silently (returns false) on purpose was the old behavior — but the controller
        // ignored the result and always answered 200, so a typo'd email looked like success.
        // Throwing here surfaces a real 404 with a message the frontend can show.
        var user = await userRepo.GetByEmailAsync(cmd.Email, ct)
            ?? throw new NotFoundException("User with email", cmd.Email);

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
