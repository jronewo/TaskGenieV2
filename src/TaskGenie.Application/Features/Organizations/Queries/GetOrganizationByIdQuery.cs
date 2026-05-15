using MediatR;
using TaskGenie.Application.Features.Organizations.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Organizations.Queries;

public sealed record GetOrganizationByIdQuery(int OrganizationId) : IRequest<OrganizationDto?>;

public sealed class GetOrganizationByIdQueryHandler(
    IOrganizationRepository organizationRepo
) : IRequestHandler<GetOrganizationByIdQuery, OrganizationDto?>
{
    public async Task<OrganizationDto?> Handle(GetOrganizationByIdQuery query, CancellationToken ct)
    {
        var org = await organizationRepo.GetByIdAsync(query.OrganizationId, ct);
        return org is not null ? OrganizationDto.FromEntity(org) : null;
    }
}
