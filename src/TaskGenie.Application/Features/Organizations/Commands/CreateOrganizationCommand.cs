using MediatR;
using TaskGenie.Application.Features.Organizations.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Organizations.Commands;

public sealed record CreateOrganizationCommand(string Name, string? Description) : IRequest<OrganizationDto>;

public sealed class CreateOrganizationCommandHandler(
    ICurrentUser currentUser,
    IOrganizationLifecycleService lifecycle,
    IOrganizationRepository organizationRepo
) : IRequestHandler<CreateOrganizationCommand, OrganizationDto>
{
    public async Task<OrganizationDto> Handle(CreateOrganizationCommand cmd, CancellationToken ct)
    {
        // Organization + creator's initial OWNER membership are created atomically.
        var organization = await lifecycle.CreateOrganizationAsync(cmd.Name, cmd.Description, currentUser.UserId, ct);

        var created = await organizationRepo.GetByIdAsync(organization.OrganizationId, ct);
        return OrganizationDto.FromEntity(created!);
    }
}
