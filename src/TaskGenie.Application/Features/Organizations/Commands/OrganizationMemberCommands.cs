using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Organizations.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Organizations.Commands;

// ── Update organization settings ─────────────────────────────────────────────────────

public sealed record UpdateOrganizationCommand(
    int OrganizationId, string? Name, string? Description, string? Logo) : IRequest<OrganizationDto>;

public sealed class UpdateOrganizationCommandHandler(
    IResourceAuthorizationService authorization,
    IOrganizationRepository organizationRepo
) : IRequestHandler<UpdateOrganizationCommand, OrganizationDto>
{
    public async Task<OrganizationDto> Handle(UpdateOrganizationCommand cmd, CancellationToken ct)
    {
        var organization = await authorization.EnsureCanManageOrganizationAsync(cmd.OrganizationId, ct);

        organization.Update(cmd.Name, cmd.Description, cmd.Logo);
        await organizationRepo.UpdateAsync(organization, ct);

        var updated = await organizationRepo.GetByIdAsync(cmd.OrganizationId, ct);
        return OrganizationDto.FromEntity(updated ?? organization);
    }
}

// ── Add a member by email ────────────────────────────────────────────────────────────

public sealed record AddOrganizationMemberCommand(
    int OrganizationId, string Email, string Role) : IRequest<OrganizationMemberDto>;

public sealed class AddOrganizationMemberCommandHandler(
    ICurrentUser currentUser,
    IResourceAuthorizationService authorization,
    IOrganizationMemberRepository memberRepo,
    IUserRepository userRepo
) : IRequestHandler<AddOrganizationMemberCommand, OrganizationMemberDto>
{
    public async Task<OrganizationMemberDto> Handle(AddOrganizationMemberCommand cmd, CancellationToken ct)
    {
        await authorization.EnsureCanManageOrganizationAsync(cmd.OrganizationId, ct);

        if (!OrganizationRoles.IsValid(cmd.Role))
            throw new InvalidOperationException($"Role must be one of OWNER, ORG_ADMIN, MEMBER.");

        var user = await userRepo.GetByEmailAsync(cmd.Email.Trim(), ct)
            ?? throw new NotFoundException("User", cmd.Email);

        var existing = await memberRepo.GetByOrganizationAndUserAsync(cmd.OrganizationId, user.UserId, ct);
        if (existing is { IsActive: true })
            throw new InvalidOperationException("This user is already a member of the organization.");

        if (existing is not null)
        {
            // Previously removed — reinstate rather than violating the unique (org, user) index.
            existing.Reinstate(cmd.Role);
            await memberRepo.UpdateAsync(existing, ct);
            return OrganizationMemberDto.FromEntity(
                await memberRepo.GetByIdAsync(existing.OrganizationMemberId, ct) ?? existing);
        }

        var member = OrganizationMember.Create(cmd.OrganizationId, user.UserId, cmd.Role, currentUser.UserId);
        await memberRepo.AddAsync(member, ct);

        return OrganizationMemberDto.FromEntity(
            await memberRepo.GetByIdAsync(member.OrganizationMemberId, ct) ?? member);
    }
}

// ── Change a member's role ───────────────────────────────────────────────────────────

public sealed record UpdateOrganizationMemberRoleCommand(
    int OrganizationId, int OrganizationMemberId, string Role) : IRequest<OrganizationMemberDto>;

public sealed class UpdateOrganizationMemberRoleCommandHandler(
    IResourceAuthorizationService authorization,
    IOrganizationMemberRepository memberRepo
) : IRequestHandler<UpdateOrganizationMemberRoleCommand, OrganizationMemberDto>
{
    public async Task<OrganizationMemberDto> Handle(UpdateOrganizationMemberRoleCommand cmd, CancellationToken ct)
    {
        await authorization.EnsureCanManageOrganizationAsync(cmd.OrganizationId, ct);

        if (!OrganizationRoles.IsValid(cmd.Role))
            throw new InvalidOperationException("Role must be one of OWNER, ORG_ADMIN, MEMBER.");

        var member = await memberRepo.GetByIdAsync(cmd.OrganizationMemberId, ct);
        // Hide members that belong to a different organization behind a 404 rather than confirming
        // the ID exists elsewhere.
        if (member is null || member.OrganizationId != cmd.OrganizationId)
            throw new NotFoundException("OrganizationMember", cmd.OrganizationMemberId);

        // Never leave the organization without an owner.
        if (member.Role == OrganizationRoles.Owner && cmd.Role != OrganizationRoles.Owner)
        {
            var owners = await memberRepo.CountActiveOwnersAsync(cmd.OrganizationId, ct);
            if (owners <= 1)
                throw new InvalidOperationException("The organization must keep at least one owner.");
        }

        member.ChangeRole(cmd.Role);
        await memberRepo.UpdateAsync(member, ct);

        return OrganizationMemberDto.FromEntity(
            await memberRepo.GetByIdAsync(member.OrganizationMemberId, ct) ?? member);
    }
}

// ── Remove a member ──────────────────────────────────────────────────────────────────

public sealed record RemoveOrganizationMemberCommand(
    int OrganizationId, int OrganizationMemberId) : IRequest<bool>;

public sealed class RemoveOrganizationMemberCommandHandler(
    IResourceAuthorizationService authorization,
    IOrganizationMemberRepository memberRepo
) : IRequestHandler<RemoveOrganizationMemberCommand, bool>
{
    public async Task<bool> Handle(RemoveOrganizationMemberCommand cmd, CancellationToken ct)
    {
        await authorization.EnsureCanManageOrganizationAsync(cmd.OrganizationId, ct);

        var member = await memberRepo.GetByIdAsync(cmd.OrganizationMemberId, ct);
        if (member is null || member.OrganizationId != cmd.OrganizationId)
            throw new NotFoundException("OrganizationMember", cmd.OrganizationMemberId);

        if (!member.IsActive) return true; // already removed — idempotent

        if (member.Role == OrganizationRoles.Owner)
        {
            var owners = await memberRepo.CountActiveOwnersAsync(cmd.OrganizationId, ct);
            if (owners <= 1)
                throw new InvalidOperationException("The organization must keep at least one owner.");
        }

        member.Remove();
        await memberRepo.UpdateAsync(member, ct);
        return true;
    }
}
