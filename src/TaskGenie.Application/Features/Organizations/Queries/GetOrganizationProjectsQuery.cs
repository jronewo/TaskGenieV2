using MediatR;
using TaskGenie.Application.Features.Organizations.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Organizations.Queries;

public sealed record GetOrganizationProjectsQuery(int OrganizationId) : IRequest<List<OrganizationProjectDto>>;

public sealed class GetOrganizationProjectsQueryHandler(
    IOrganizationRepository organizationRepo
) : IRequestHandler<GetOrganizationProjectsQuery, List<OrganizationProjectDto>>
{
    public async Task<List<OrganizationProjectDto>> Handle(GetOrganizationProjectsQuery query, CancellationToken ct)
    {
        var projects = await organizationRepo.GetProjectsByOrganizationIdAsync(query.OrganizationId, ct);
        return projects.Select(OrganizationProjectDto.FromEntity).ToList();
    }
}
