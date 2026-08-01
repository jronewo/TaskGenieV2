using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Organizations.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Organizations.Commands;

/// <summary>Adds an existing user (resolved by UserId or, if not supplied, by Email) to the
/// organization's membership roster. Never creates a new user account here.</summary>
public sealed record AddOrganizationMemberCommand(
    int OrganizationId,
    int? UserId,
    string? Email,
    string Role
) : IRequest<OrganizationMemberDto>;

public sealed class AddOrganizationMemberCommandHandler(
    ICurrentUser currentUser,
    IOrganizationRepository organizationRepo,
    IOrganizationMemberRepository memberRepo,
    IUserRepository userRepo
) : IRequestHandler<AddOrganizationMemberCommand, OrganizationMemberDto>
{
    public async Task<OrganizationMemberDto> Handle(AddOrganizationMemberCommand cmd, CancellationToken ct)
    {
        _ = await organizationRepo.GetByIdAsync(cmd.OrganizationId, ct)
            ?? throw new NotFoundException("Organization", cmd.OrganizationId);

        await OrganizationMembershipGuard.EnsureCanManageMembersAsync(currentUser, memberRepo, cmd.OrganizationId, ct);

        var role = (cmd.Role ?? OrganizationRole.Member).ToUpperInvariant();
        if (!OrganizationRole.IsValid(role))
            throw new InvalidOperationException($"'{cmd.Role}' is not a valid organization role.");

        User? user = null;
        if (cmd.UserId is int userId)
            user = await userRepo.GetByIdAsync(userId, ct);
        else if (!string.IsNullOrWhiteSpace(cmd.Email))
            user = await userRepo.GetByEmailAsync(cmd.Email, ct);

        if (user is null)
            throw new NotFoundException("User", cmd.UserId ?? 0);

        var existing = await memberRepo.GetMembershipAsync(cmd.OrganizationId, user.UserId, ct);
        if (existing is not null)
            throw new InvalidOperationException("This user is already a member of the organization.");

        var member = OrganizationMember.Create(cmd.OrganizationId, user.UserId, role);
        await memberRepo.AddAsync(member, ct);

        var created = await memberRepo.GetByIdAsync(member.OrganizationMemberId, ct);
        return OrganizationMemberDto.FromEntity(created!);
    }
}
