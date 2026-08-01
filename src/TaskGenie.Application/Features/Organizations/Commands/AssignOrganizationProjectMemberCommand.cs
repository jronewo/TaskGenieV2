using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Organizations.Commands;

/// <summary>Lets an organization OWNER/ADMIN assign an org member onto one of the
/// organization's projects, and promote/demote them to/from PROJECT_LEADER — implemented as
/// the project's dedicated Team membership (TeamMember.Role "LEADER"/"MEMBER"), which is what
/// the rest of the system already treats as project-leader authority. The target user must
/// already be a member of the *same* organization as the project.</summary>
public sealed record AssignOrganizationProjectMemberCommand(
    int OrganizationId,
    int ProjectId,
    int UserId,
    string Role
) : IRequest<bool>;

public sealed class AssignOrganizationProjectMemberCommandHandler(
    ICurrentUser currentUser,
    IOrganizationMemberRepository orgMemberRepo,
    IProjectRepository projectRepo,
    ITeamMemberRepository teamMemberRepo
) : IRequestHandler<AssignOrganizationProjectMemberCommand, bool>
{
    private static readonly HashSet<string> ValidTeamRoles = new(StringComparer.OrdinalIgnoreCase) { "MEMBER", "LEADER" };

    public async Task<bool> Handle(AssignOrganizationProjectMemberCommand cmd, CancellationToken ct)
    {
        await OrganizationMembershipGuard.EnsureCanManageMembersAsync(currentUser, orgMemberRepo, cmd.OrganizationId, ct);

        var project = await projectRepo.GetByIdAsync(cmd.ProjectId, ct)
            ?? throw new NotFoundException("Project", cmd.ProjectId);

        if (project.OrganizationId != cmd.OrganizationId)
            throw new ForbiddenException("This project does not belong to the specified organization.");

        if (project.TeamId is not int teamId)
            throw new InvalidOperationException("This project has no team to assign members to.");

        // The assignee must belong to the same organization — an org admin cannot pull in an
        // outside user through the project-assignment path.
        await OrganizationMembershipGuard.EnsureIsMemberAsync(orgMemberRepo, cmd.OrganizationId, cmd.UserId, ct);

        var role = cmd.Role.ToUpperInvariant();
        if (!ValidTeamRoles.Contains(role))
            throw new InvalidOperationException($"'{cmd.Role}' is not a valid project role (expected MEMBER or LEADER).");

        var teamMembers = await teamMemberRepo.GetByTeamIdAsync(teamId, ct);
        var existing = teamMembers.FirstOrDefault(m => m.UserId == cmd.UserId);

        if (existing is not null)
        {
            existing.SetRole(role);
            await teamMemberRepo.UpdateAsync(existing, ct);
        }
        else
        {
            var member = TeamMember.Create(teamId, cmd.UserId, role);
            await teamMemberRepo.AddAsync(member, ct);
        }

        return true;
    }
}
