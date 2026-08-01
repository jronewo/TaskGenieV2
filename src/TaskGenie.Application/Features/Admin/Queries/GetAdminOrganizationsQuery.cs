using MediatR;
using TaskGenie.Application.Common.Models;
using TaskGenie.Application.Features.Admin.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Admin.Queries;

public sealed record GetAdminOrganizationsQuery(int Page = 1, int PageSize = 20, string? Search = null)
    : IRequest<PagedResult<AdminOrganizationDto>>;

public sealed class GetAdminOrganizationsQueryHandler(
    IOrganizationRepository organizationRepo,
    IOrganizationMemberRepository memberRepo,
    IProjectRepository projectRepo,
    ISubscriptionEntitlementService entitlementService
) : IRequestHandler<GetAdminOrganizationsQuery, PagedResult<AdminOrganizationDto>>
{
    public async Task<PagedResult<AdminOrganizationDto>> Handle(GetAdminOrganizationsQuery query, CancellationToken ct)
    {
        var organizations = await organizationRepo.GetAllAsync(ct);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            organizations = organizations
                .Where(o => o.Name.Contains(term, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        organizations = organizations.OrderByDescending(o => o.CreatedAt).ToList();
        var page = PagedResult<Domain.Entities.Organization>.Create(organizations, query.Page, query.PageSize);

        var items = new List<AdminOrganizationDto>();
        foreach (var org in page.Items)
        {
            var members = await memberRepo.GetByOrganizationIdAsync(org.OrganizationId, ct);
            var projects = await projectRepo.GetProjectsByOrgIdAsync(org.OrganizationId, ct);
            var entitlement = await entitlementService.GetOrganizationEntitlementAsync(org.OrganizationId, ct);

            items.Add(new AdminOrganizationDto
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
            });
        }

        return new PagedResult<AdminOrganizationDto>
        {
            Items = items,
            TotalCount = page.TotalCount,
            Page = page.Page,
            PageSize = page.PageSize
        };
    }
}
