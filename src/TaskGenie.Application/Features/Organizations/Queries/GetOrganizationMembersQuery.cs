using MediatR;
using TaskGenie.Application.Features.Organizations.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Organizations.Queries;

public sealed record GetOrganizationMembersQuery(int OrganizationId) : IRequest<List<OrganizationMemberDto>>;

public sealed class GetOrganizationMembersQueryHandler(
    IResourceAuthorizationService authorization,
    IOrganizationMemberRepository memberRepo
) : IRequestHandler<GetOrganizationMembersQuery, List<OrganizationMemberDto>>
{
    public async Task<List<OrganizationMemberDto>> Handle(GetOrganizationMembersQuery query, CancellationToken ct)
    {
        // Any active member may see who else is in the organization; outsiders may not.
        await authorization.EnsureCanAccessOrganizationAsync(query.OrganizationId, ct);

        var members = await memberRepo.GetActiveByOrganizationAsync(query.OrganizationId, ct);
        return members.Select(OrganizationMemberDto.FromEntity).ToList();
    }
}
