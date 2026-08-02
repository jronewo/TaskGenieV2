using MediatR;
using TaskGenie.Application.Features.Organizations.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Organizations.Queries;

public sealed record GetMyOrganizationQuery : IRequest<MyOrganizationDto?>;

public sealed record MyOrganizationDto(OrganizationDto Organization, List<OrganizationProjectDto> Projects);

public sealed class GetMyOrganizationQueryHandler(
    ICurrentUser currentUser,
    IOrganizationRepository organizationRepo
) : IRequestHandler<GetMyOrganizationQuery, MyOrganizationDto?>
{
    public async Task<MyOrganizationDto?> Handle(GetMyOrganizationQuery query, CancellationToken ct)
    {
        var org = await organizationRepo.GetByOwnerIdAsync(currentUser.UserId, ct);
        if (org is null) return null;

        var projects = await organizationRepo.GetProjectsByOrganizationIdAsync(org.OrganizationId, ct);
        return new MyOrganizationDto(
            OrganizationDto.FromEntity(org),
            projects.Select(OrganizationProjectDto.FromEntity).ToList());
    }
}
