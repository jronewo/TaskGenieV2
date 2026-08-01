using MediatR;
using TaskGenie.Application.Features.Organizations.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Organizations.Queries;

/// <summary>Every organization the current user is a member of (any role), with their role in
/// each — the FE's post-login "organization context" call.</summary>
public sealed record GetMyOrganizationsQuery : IRequest<List<MyOrganizationDto>>;

public sealed class GetMyOrganizationsQueryHandler(
    ICurrentUser currentUser,
    IOrganizationMemberRepository memberRepo
) : IRequestHandler<GetMyOrganizationsQuery, List<MyOrganizationDto>>
{
    public async Task<List<MyOrganizationDto>> Handle(GetMyOrganizationsQuery query, CancellationToken ct)
    {
        var memberships = await memberRepo.GetByUserIdAsync(currentUser.UserId, ct);

        return memberships
            .Where(m => m.Organization is not null)
            .Select(m => new MyOrganizationDto
            {
                Organization = OrganizationDto.FromEntity(m.Organization!),
                Role = m.Role
            })
            .ToList();
    }
}
