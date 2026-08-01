using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Projects.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
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
    IOrganizationRepository organizationRepo,
    IOrganizationMemberRepository organizationMemberRepo,
    ISubscriptionEntitlementService entitlementService
) : IRequestHandler<CreateProjectCommand, ProjectDto>
{
    public async Task<ProjectDto> Handle(CreateProjectCommand cmd, CancellationToken ct)
    {
        // A project can only be filed under an organization by that organization's OWNER or
        // ADMIN (or a platform admin) — plain MEMBERs, and anyone not in the roster at all,
        // cannot spoof tenant scope by supplying an arbitrary OrganizationId.
        if (cmd.OrganizationId is int organizationId)
        {
            _ = await organizationRepo.GetByIdAsync(organizationId, ct)
                ?? throw new NotFoundException("Organization", organizationId);

            if (!currentUser.IsPlatformAdmin)
            {
                var membership = await organizationMemberRepo.GetMembershipAsync(organizationId, currentUser.UserId, ct);
                if (membership is null || membership.Role is not (OrganizationRole.Owner or OrganizationRole.Admin))
                    throw new ForbiddenException("You do not have permission to create a project under this organization.");
            }

            // Server-enforced quota: the organization's active subscription plan (or the
            // implicit Free tier if it has none) caps how many projects it may own.
            if (!currentUser.IsPlatformAdmin)
                await entitlementService.EnsureCanCreateOrganizationProjectAsync(organizationId, ct);
        }
        else if (!currentUser.IsPlatformAdmin)
        {
            // Server-enforced quota: the creator's personal plan caps how many personal
            // (non-organization) projects they may own.
            await entitlementService.EnsureCanCreatePersonalProjectAsync(currentUser.UserId, ct);
        }

        // Team + initial LEADER membership + Project are created atomically so a failure
        // partway through never leaves an orphaned team or a project without its team.
        var project = await lifecycle.CreateProjectWithDedicatedTeamAsync(
            cmd.Name, cmd.Description, currentUser.UserId, cmd.OrganizationId, cmd.Deadline, ct);

        var created = await projectRepo.GetByIdAsync(project.ProjectId, ct);
        return ProjectDto.FromEntity(created!);
    }
}
