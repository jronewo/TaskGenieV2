using MediatR;
using TaskGenie.Application.Features.Organizations.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Organizations.Queries;

public sealed record GetOrganizationProjectsQuery(int OrganizationId) : IRequest<List<OrganizationProjectDto>>;

public sealed class GetOrganizationProjectsQueryHandler(
    IResourceAuthorizationService authorization,
    IOrganizationRepository organizationRepo
) : IRequestHandler<GetOrganizationProjectsQuery, List<OrganizationProjectDto>>
{
    public async Task<List<OrganizationProjectDto>> Handle(GetOrganizationProjectsQuery query, CancellationToken ct)
    {
        await authorization.EnsureCanAccessOrganizationAsync(query.OrganizationId, ct);
        var projects = await organizationRepo.GetProjectsByOrganizationIdAsync(query.OrganizationId, ct);
        return projects.Select(OrganizationProjectDto.FromEntity).ToList();
    }
}
