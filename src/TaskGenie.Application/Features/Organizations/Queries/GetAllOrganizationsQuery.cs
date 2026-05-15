using MediatR;
using TaskGenie.Application.Features.Organizations.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Organizations.Queries;

public sealed record GetAllOrganizationsQuery : IRequest<List<OrganizationDto>>;

public sealed class GetAllOrganizationsQueryHandler(
    IOrganizationRepository organizationRepo
) : IRequestHandler<GetAllOrganizationsQuery, List<OrganizationDto>>
{
    public async Task<List<OrganizationDto>> Handle(GetAllOrganizationsQuery query, CancellationToken ct)
    {
        var orgs = await organizationRepo.GetAllAsync(ct);
        return orgs.Select(OrganizationDto.FromEntity).ToList();
    }
}
