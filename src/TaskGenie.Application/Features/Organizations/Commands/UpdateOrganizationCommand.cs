using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Organizations.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Organizations.Commands;

public sealed record UpdateOrganizationCommand(
    int OrganizationId,
    string? Name,
    string? Description,
    string? Logo
) : IRequest<OrganizationDto>;

public sealed class UpdateOrganizationCommandHandler(
    ICurrentUser currentUser,
    IOrganizationMemberRepository memberRepo,
    IOrganizationRepository organizationRepo
) : IRequestHandler<UpdateOrganizationCommand, OrganizationDto>
{
    public async Task<OrganizationDto> Handle(UpdateOrganizationCommand cmd, CancellationToken ct)
    {
        var organization = await organizationRepo.GetByIdAsync(cmd.OrganizationId, ct)
            ?? throw new NotFoundException("Organization", cmd.OrganizationId);

        await OrganizationMembershipGuard.EnsureCanManageMembersAsync(currentUser, memberRepo, cmd.OrganizationId, ct);

        organization.Update(cmd.Name, cmd.Description, cmd.Logo);
        await organizationRepo.UpdateAsync(organization, ct);

        var updated = await organizationRepo.GetByIdAsync(cmd.OrganizationId, ct);
        return OrganizationDto.FromEntity(updated!);
    }
}
