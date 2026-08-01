using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Application.Features.Organizations;

/// <summary>Shared OWNER/ADMIN membership checks reused by every organization-management
/// command. Platform admins always pass. Never trusts a client-supplied role — always
/// re-resolves the caller's current OrganizationMember row.</summary>
internal static class OrganizationMembershipGuard
{
    public static async Task<OrganizationMember?> EnsureCanManageMembersAsync(
        ICurrentUser currentUser,
        IOrganizationMemberRepository memberRepo,
        int organizationId,
        CancellationToken ct)
    {
        if (currentUser.IsPlatformAdmin) return null;

        var membership = await memberRepo.GetMembershipAsync(organizationId, currentUser.UserId, ct);
        if (membership is null || membership.Role is not (OrganizationRole.Owner or OrganizationRole.Admin))
            throw new ForbiddenException("You do not have permission to manage this organization's members.");

        return membership;
    }

    public static async Task EnsureIsMemberAsync(
        IOrganizationMemberRepository memberRepo,
        int organizationId,
        int userId,
        CancellationToken ct)
    {
        var membership = await memberRepo.GetMembershipAsync(organizationId, userId, ct);
        if (membership is null)
            throw new InvalidOperationException("This user is not a member of the organization.");
    }
}
