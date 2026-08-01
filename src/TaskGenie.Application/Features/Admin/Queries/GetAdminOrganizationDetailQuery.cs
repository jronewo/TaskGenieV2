using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Admin.DTOs;
using TaskGenie.Application.Features.Organizations.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Admin.Queries;

public sealed record GetAdminOrganizationDetailQuery(int OrganizationId) : IRequest<AdminOrganizationDetailDto>;

public sealed class GetAdminOrganizationDetailQueryHandler(
    IOrganizationRepository organizationRepo,
    IOrganizationMemberRepository memberRepo,
    IProjectRepository projectRepo,
    ISubscriptionEntitlementService entitlementService
) : IRequestHandler<GetAdminOrganizationDetailQuery, AdminOrganizationDetailDto>
{
    public async Task<AdminOrganizationDetailDto> Handle(GetAdminOrganizationDetailQuery query, CancellationToken ct)
    {
        var org = await organizationRepo.GetByIdAsync(query.OrganizationId, ct)
            ?? throw new NotFoundException("Organization", query.OrganizationId);

        var members = await memberRepo.GetByOrganizationIdAsync(query.OrganizationId, ct);
        var projects = await projectRepo.GetProjectsByOrgIdAsync(query.OrganizationId, ct);
        var entitlement = await entitlementService.GetOrganizationEntitlementAsync(query.OrganizationId, ct);

        var summary = new AdminOrganizationDto
        {
            OrganizationId = org.OrganizationId,
            Name = org.Name,
            Description = org.Description,
            OwnerId = org.OwnerId,
            OwnerName = org.Owner?.Name,
            MemberCount = members.Count,
            ProjectCount = projects.Count,
            CurrentPlanCode = entitlement.PlanCode,
            CurrentPlanName = entitlement.PlanName,
            SubscriptionStatus = entitlement.SubscriptionStatus,
            CreatedAt = org.CreatedAt
        };

        return new AdminOrganizationDetailDto
        {
            Summary = summary,
            Members = members.Select(OrganizationMemberDto.FromEntity).ToList()
        };
    }
}
