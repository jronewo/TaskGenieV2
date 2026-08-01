using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Organizations.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Organizations.Queries;

public sealed record GetOrganizationMembersQuery(int OrganizationId) : IRequest<List<OrganizationMemberDto>>;

public sealed class GetOrganizationMembersQueryHandler(
    ICurrentUser currentUser,
    IOrganizationRepository organizationRepo,
    IOrganizationMemberRepository memberRepo
) : IRequestHandler<GetOrganizationMembersQuery, List<OrganizationMemberDto>>
{
    public async Task<List<OrganizationMemberDto>> Handle(GetOrganizationMembersQuery query, CancellationToken ct)
    {
        _ = await organizationRepo.GetByIdAsync(query.OrganizationId, ct)
            ?? throw new NotFoundException("Organization", query.OrganizationId);

        // Read access: platform admin, or any member of the organization (not just OWNER/ADMIN)
        // — members can see their own roster, only management actions are OWNER/ADMIN-gated.
        if (!currentUser.IsPlatformAdmin)
        {
            var membership = await memberRepo.GetMembershipAsync(query.OrganizationId, currentUser.UserId, ct);
            if (membership is null)
                throw new ForbiddenException("You do not have access to this organization's members.");
        }

        var members = await memberRepo.GetByOrganizationIdAsync(query.OrganizationId, ct);
        return members.Select(OrganizationMemberDto.FromEntity).ToList();
    }
}
