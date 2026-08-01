using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Organizations.Commands;

public sealed record RemoveOrganizationMemberCommand(int OrganizationId, int OrganizationMemberId) : IRequest<bool>;

public sealed class RemoveOrganizationMemberCommandHandler(
    ICurrentUser currentUser,
    IOrganizationMemberRepository memberRepo
) : IRequestHandler<RemoveOrganizationMemberCommand, bool>
{
    public async Task<bool> Handle(RemoveOrganizationMemberCommand cmd, CancellationToken ct)
    {
        await OrganizationMembershipGuard.EnsureCanManageMembersAsync(currentUser, memberRepo, cmd.OrganizationId, ct);

        var target = await memberRepo.GetByIdAsync(cmd.OrganizationMemberId, ct)
            ?? throw new NotFoundException("OrganizationMember", cmd.OrganizationMemberId);

        if (target.OrganizationId != cmd.OrganizationId)
            throw new NotFoundException("OrganizationMember", cmd.OrganizationMemberId);

        if (target.Role == OrganizationRole.Owner)
        {
            var members = await memberRepo.GetByOrganizationIdAsync(cmd.OrganizationId, ct);
            var ownerCount = members.Count(m => m.Role == OrganizationRole.Owner);
            if (ownerCount <= 1)
                throw new InvalidOperationException("Cannot remove the last owner of the organization.");
        }

        await memberRepo.DeleteAsync(cmd.OrganizationMemberId, ct);
        return true;
    }
}
