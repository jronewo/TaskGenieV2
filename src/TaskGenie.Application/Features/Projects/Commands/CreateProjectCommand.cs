using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Projects.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Projects.Commands;

public sealed record CreateProjectCommand(
    string Name,
    string? Description,
    int? OrganizationId,
    DateOnly? Deadline
) : IRequest<ProjectDto>;

public sealed class CreateProjectCommandHandler(
    ICurrentUser currentUser,
    IProjectRepository projectRepo,
    IProjectLifecycleService lifecycle,
    IResourceAuthorizationService authz,
    IEntitlementService entitlements
) : IRequestHandler<CreateProjectCommand, ProjectDto>
{
    public async Task<ProjectDto> Handle(CreateProjectCommand cmd, CancellationToken ct)
    {
        // Filing a project under an organization is an owner/ORG_ADMIN action — a plain member may
        // not, or any authenticated user could spoof tenant scope with an arbitrary OrganizationId.
        // Delegated rather than re-checked here: this used to allow the owner only, which silently
        // locked out the admins the organization page lets you appoint.
        if (cmd.OrganizationId is int organizationId)
        {
            await authz.EnsureCanManageOrganizationAsync(organizationId, ct);
        }

        // Quota is checked immediately before the write so two concurrent creates can't both
        // squeeze past a limit that only one of them should clear.
        await entitlements.EnsureCanCreateProjectAsync(currentUser.UserId, cmd.OrganizationId, ct);

        // Team + initial LEADER membership + Project are created atomically so a failure
        // partway through never leaves an orphaned team or a project without its team.
        var project = await lifecycle.CreateProjectWithDedicatedTeamAsync(
            cmd.Name, cmd.Description, currentUser.UserId, cmd.OrganizationId, cmd.Deadline, ct);

        var created = await projectRepo.GetByIdAsync(project.ProjectId, ct);
        return ProjectDto.FromEntity(created!);
    }
}
