using MediatR;
using TaskGenie.Application.Features.Organizations.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Organizations.Queries;

/// <summary>Every organization the caller is an ACTIVE member of — not just the ones they own.
/// Drives the organization switcher.</summary>
public sealed record GetMyOrganizationsQuery : IRequest<List<MyOrganizationSummaryDto>>;

public sealed record MyOrganizationSummaryDto(
    int OrganizationId,
    string Name,
    string? Description,
    string? Logo,
    string Role,
    bool IsOwner);

public sealed class GetMyOrganizationsQueryHandler(
    ICurrentUser currentUser,
    IOrganizationMemberRepository memberRepo
) : IRequestHandler<GetMyOrganizationsQuery, List<MyOrganizationSummaryDto>>
{
    public async Task<List<MyOrganizationSummaryDto>> Handle(GetMyOrganizationsQuery query, CancellationToken ct)
    {
        var memberships = await memberRepo.GetActiveByUserAsync(currentUser.UserId, ct);

        return memberships
            .Where(m => m.Organization is not null)
            .Select(m => new MyOrganizationSummaryDto(
                m.OrganizationId,
                m.Organization!.Name,
                m.Organization.Description,
                m.Organization.Logo,
                m.Role,
                m.Organization.OwnerId == currentUser.UserId))
            .ToList();
    }
}
