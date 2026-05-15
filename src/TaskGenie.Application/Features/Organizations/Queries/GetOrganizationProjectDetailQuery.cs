using MediatR;
using TaskGenie.Application.Features.Organizations.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Organizations.Queries;

public sealed record GetOrganizationProjectDetailQuery(
    int OrganizationId,
    int ProjectId
) : IRequest<OrganizationProjectDto?>;

public sealed class GetOrganizationProjectDetailQueryHandler(
    IOrganizationRepository organizationRepo
) : IRequestHandler<GetOrganizationProjectDetailQuery, OrganizationProjectDto?>
{
    public async Task<OrganizationProjectDto?> Handle(GetOrganizationProjectDetailQuery query, CancellationToken ct)
    {
        var projects = await organizationRepo.GetProjectsByOrganizationIdAsync(query.OrganizationId, ct);
        var project = projects.FirstOrDefault(p => p.ProjectId == query.ProjectId);
        return project is not null ? OrganizationProjectDto.FromEntity(project) : null;
    }
}
