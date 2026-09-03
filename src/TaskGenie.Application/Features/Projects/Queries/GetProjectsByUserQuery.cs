using MediatR;
using TaskGenie.Application.Features.Projects.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Projects.Queries;

/// <summary>
/// The caller's projects, split three ways: active, closed, or soft-deleted (the Trash view).
///
/// A closed project is finished work, not a workspace: left in, it would keep occupying the
/// sidebar, the board switcher and the dashboard grid forever. It stays fully readable through
/// <c>Closed = true</c>, which is what the profile's finished-projects list asks for. A deleted
/// project stays out of both unless <c>Deleted = true</c> is asked for explicitly — that is the
/// Trash list, the only place a soft-deleted project is still visible during its grace period.
/// </summary>
public sealed record GetProjectsByUserQuery(int UserId, bool Closed = false, bool Deleted = false) : IRequest<List<ProjectDto>>;

public sealed class GetProjectsByUserQueryHandler(
    IProjectRepository projectRepo,
    ISubscriptionRepository subscriptionRepo,
    IResourceAuthorizationService authz
) : IRequestHandler<GetProjectsByUserQuery, List<ProjectDto>>
{
    public async Task<List<ProjectDto>> Handle(GetProjectsByUserQuery query, CancellationToken ct)
    {
        var projects = await projectRepo.GetProjectsByUserIdAsync(query.UserId, ct);
        var visible = query.Deleted
            // Trash view: only what's still recoverable, regardless of what it was before deletion.
            ? projects.Where(p => p.IsDeleted).ToList()
            // Every other view must never show a soft-deleted project while it waits out its grace
            // period — the purge worker is what eventually removes the row for real.
            : projects.Where(p => !p.IsDeleted && p.IsClosed == query.Closed).ToList();

        // Organizations are a paid feature. When an organization's subscription lapses its projects
        // drop out of every list at once — sidebar, dashboard, project page, profile — because they
        // all read this one query. Filtering in each screen instead would guarantee one of them was
        // missed, and the API would still be handing the rows out.
        var organizationIds = visible
            .Where(p => p.OrganizationId.HasValue)
            .Select(p => p.OrganizationId!.Value)
            .Distinct()
            .ToList();

        if (organizationIds.Count > 0)
        {
            var paidOrganizations = new HashSet<int>();
            foreach (var organizationId in organizationIds)
            {
                var subscription = await subscriptionRepo.GetEffectiveForOrganizationAsync(organizationId, ct);
                if (subscription?.Plan is { IsFree: false }) paidOrganizations.Add(organizationId);
            }

            visible = visible
                .Where(p => !p.OrganizationId.HasValue || paidOrganizations.Contains(p.OrganizationId.Value))
                .ToList();
        }

        // CanManageTasks was only ever populated by GetProjectByIdQuery, so on this list it stayed
        // at its default of false — and every control gated on it (the scheduled risk estimate,
        // End project) was invisible to leaders on the projects page. It is a rendering hint only;
        // each endpoint still enforces the same rule itself.
        var dtos = new List<ProjectDto>(visible.Count);
        foreach (var project in visible)
        {
            var dto = ProjectDto.FromEntity(project);
            dto.CanManageTasks = await authz.CanManageTasksInProjectAsync(project.ProjectId, ct);
            dtos.Add(dto);
        }
        return dtos;
    }
}
