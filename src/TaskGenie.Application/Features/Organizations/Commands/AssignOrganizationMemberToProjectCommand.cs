using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Organizations.Commands;

/// <summary>Adds an organization member to the team backing one of that organization's projects.
/// Set <paramref name="AsLeader"/> to promote them to Project Leader.</summary>
public sealed record AssignOrganizationMemberToProjectCommand(
    int OrganizationId,
    int ProjectId,
    int UserId,
    bool AsLeader = false) : IRequest<bool>;

public sealed class AssignOrganizationMemberToProjectCommandHandler(
    IResourceAuthorizationService authorization,
    IOrganizationMemberRepository memberRepo,
    IProjectRepository projectRepo,
    ITeamMemberRepository teamMemberRepo
) : IRequestHandler<AssignOrganizationMemberToProjectCommand, bool>
{
    public async Task<bool> Handle(AssignOrganizationMemberToProjectCommand cmd, CancellationToken ct)
    {
        await authorization.EnsureCanManageOrganizationAsync(cmd.OrganizationId, ct);

        // The project must actually belong to this organization — otherwise an org admin could
        // staff another tenant's project by mixing IDs in the route.
        var project = await projectRepo.GetByIdAsync(cmd.ProjectId, ct);
        if (project is null || project.OrganizationId != cmd.OrganizationId)
            throw new NotFoundException("Project", cmd.ProjectId);

        if (project.TeamId is not int teamId)
            throw new InvalidOperationException("This project has no team to assign members to.");

        // Only an active member of the same organization may be staffed onto its project.
        var membership = await memberRepo.GetByOrganizationAndUserAsync(cmd.OrganizationId, cmd.UserId, ct);
        if (membership is not { IsActive: true })
            throw new InvalidOperationException("That user is not an active member of this organization.");

        var role = cmd.AsLeader ? "LEADER" : "MEMBER";
        var existing = await teamMemberRepo.GetByTeamIdAsync(teamId, ct);
        var current = existing.FirstOrDefault(m => m.UserId == cmd.UserId);

        if (current is null)
        {
            await teamMemberRepo.AddAsync(TeamMember.Create(teamId, cmd.UserId, role), ct);
            return true;
        }

        if (current.Role != role)
        {
            current.ChangeRole(role);
            await teamMemberRepo.UpdateAsync(current, ct);
        }

        return true;
    }
}
