using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Organizations.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Organizations.Commands;

public sealed record UpdateOrganizationMemberRoleCommand(
    int OrganizationId,
    int OrganizationMemberId,
    string Role
) : IRequest<OrganizationMemberDto>;

public sealed class UpdateOrganizationMemberRoleCommandHandler(
    ICurrentUser currentUser,
    IOrganizationMemberRepository memberRepo
) : IRequestHandler<UpdateOrganizationMemberRoleCommand, OrganizationMemberDto>
{
    public async Task<OrganizationMemberDto> Handle(UpdateOrganizationMemberRoleCommand cmd, CancellationToken ct)
    {
        await OrganizationMembershipGuard.EnsureCanManageMembersAsync(currentUser, memberRepo, cmd.OrganizationId, ct);

        var target = await memberRepo.GetByIdAsync(cmd.OrganizationMemberId, ct)
            ?? throw new NotFoundException("OrganizationMember", cmd.OrganizationMemberId);

        if (target.OrganizationId != cmd.OrganizationId)
            throw new NotFoundException("OrganizationMember", cmd.OrganizationMemberId);

        var newRole = cmd.Role.ToUpperInvariant();
        if (!OrganizationRole.IsValid(newRole))
            throw new InvalidOperationException($"'{cmd.Role}' is not a valid organization role.");

        if (target.Role == OrganizationRole.Owner && newRole != OrganizationRole.Owner)
        {
            var members = await memberRepo.GetByOrganizationIdAsync(cmd.OrganizationId, ct);
            var ownerCount = members.Count(m => m.Role == OrganizationRole.Owner);
            if (ownerCount <= 1)
                throw new InvalidOperationException("Cannot demote the last owner of the organization.");
        }

        target.ChangeRole(newRole);
        await memberRepo.UpdateAsync(target, ct);

        var updated = await memberRepo.GetByIdAsync(cmd.OrganizationMemberId, ct);
        return OrganizationMemberDto.FromEntity(updated!);
    }
}
