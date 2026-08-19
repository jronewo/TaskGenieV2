using MediatR;
using TaskGenie.Application.Features.Organizations.DTOs;
using TaskGenie.Application.Interfaces;

namespace TaskGenie.Application.Features.Organizations.Queries;

public sealed record GetOrganizationByIdQuery(int OrganizationId) : IRequest<OrganizationDto?>;

public sealed class GetOrganizationByIdQueryHandler(
    IResourceAuthorizationService authorization
) : IRequestHandler<GetOrganizationByIdQuery, OrganizationDto?>
{
    public async Task<OrganizationDto?> Handle(GetOrganizationByIdQuery query, CancellationToken ct)
    {
        var org = await authorization.EnsureCanAccessOrganizationAsync(query.OrganizationId, ct);
        return OrganizationDto.FromEntity(org);
    }
}
