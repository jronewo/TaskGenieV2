using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Projects.Commands;

public sealed record UpdateProjectCommand(
    int ProjectId,
    string? Name,
    string? Description,
    string? Status,
    int? TeamId,
    DateOnly? Deadline
) : IRequest<bool>;

public sealed class UpdateProjectCommandHandler(
    ICurrentUser currentUser,
    IResourceAuthorizationService authz,
    IProjectLifecycleService lifecycle,
    ITeamRepository teamRepo
) : IRequestHandler<UpdateProjectCommand, bool>
{
    public async Task<bool> Handle(UpdateProjectCommand cmd, CancellationToken ct)
    {
        var project = await authz.EnsureCanManageProjectAsync(cmd.ProjectId, ct);
        var previousTeamId = project.TeamId;

        // Reassigning the project to a different team is a tenant-affecting change: only the
        // team's own creator (or a platform admin) may do it. Keeping the current team (or not
        // touching TeamId) never requires this extra check.
        if (cmd.TeamId.HasValue && cmd.TeamId.Value != project.TeamId)
        {
            var team = await teamRepo.GetByIdAsync(cmd.TeamId.Value, ct)
                ?? throw new NotFoundException("Team", cmd.TeamId.Value);

            if (!currentUser.IsPlatformAdmin && team.CreatedBy != currentUser.UserId)
                throw new ForbiddenException("You do not have permission to assign this team to the project.");
        }

        project.Update(cmd.Name, cmd.Description, cmd.Status, cmd.TeamId, cmd.Deadline);

        // Persisting and (if the team changed away from a project-managed team no longer
        // referenced by anyone else) cleaning up the old team happen atomically.
        await lifecycle.UpdateProjectAsync(project, previousTeamId, ct);
        return true;
    }
}
