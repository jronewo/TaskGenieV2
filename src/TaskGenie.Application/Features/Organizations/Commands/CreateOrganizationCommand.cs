using MediatR;
using TaskGenie.Application.Features.Organizations.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Organizations.Commands;

/// <summary>The creator becomes the organization OWNER. The owner is always the authenticated
/// actor — never supplied by the client.</summary>
public sealed record CreateOrganizationCommand(string Name, string? Description) : IRequest<OrganizationDto>;

public sealed class CreateOrganizationCommandHandler(
    ICurrentUser currentUser,
    IOrganizationRepository organizationRepo,
    IOrganizationMemberRepository memberRepo
) : IRequestHandler<CreateOrganizationCommand, OrganizationDto>
{
    public async Task<OrganizationDto> Handle(CreateOrganizationCommand cmd, CancellationToken ct)
    {
        var organization = Organization.Create(cmd.Name, cmd.Description, currentUser.UserId);
        await organizationRepo.AddAsync(organization, ct);

        // The creator is registered as an ACTIVE OWNER member so membership queries and
        // entitlement checks have a single source of truth.
        var ownerMembership = OrganizationMember.Create(
            organization.OrganizationId, currentUser.UserId, OrganizationRoles.Owner);
        await memberRepo.AddAsync(ownerMembership, ct);

        var created = await organizationRepo.GetByIdAsync(organization.OrganizationId, ct);
        return OrganizationDto.FromEntity(created ?? organization);
    }
}
