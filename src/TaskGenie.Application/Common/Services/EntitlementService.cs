using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Application.Common.Services;

public sealed class EntitlementService(
    IPlanRepository planRepo,
    ISubscriptionRepository subscriptionRepo,
    IProjectRepository projectRepo,
    IOrganizationMemberRepository memberRepo) : IEntitlementService
{
    /// <summary>Fallback when no FREE_PERSONAL plan row exists yet (fresh database). Keeps the
    /// documented rule — two active projects — enforced rather than silently unlimited.</summary>
    private const int DefaultFreeProjectLimit = 2;

    public async Task<EffectiveEntitlement> GetForUserAsync(int userId, CancellationToken ct = default)
    {
        var sources = new List<string>();
        int? projectLimit = null;
        string planCode = "FREE_PERSONAL";
        string planName = "Free";
        var isPremium = false;

        var personal = await subscriptionRepo.GetEffectiveForUserAsync(userId, ct);
        if (personal?.Plan is { } personalPlan)
        {
            sources.Add($"personal:{personalPlan.Code}");
            planCode = personalPlan.Code;
            planName = personalPlan.Name;
            projectLimit = personalPlan.ProjectLimit;
            isPremium = !personalPlan.IsFree;
        }
        else
        {
            var freePlan = await planRepo.GetByCodeAsync("FREE_PERSONAL", ct);
            projectLimit = freePlan?.ProjectLimit ?? DefaultFreeProjectLimit;
            if (freePlan is not null) planName = freePlan.Name;
        }

        // Premium may also be inherited from any organization the user actively belongs to.
        // Inheritance never mutates the user's own plan — it is recomputed on every call.
        var memberships = await memberRepo.GetActiveByUserAsync(userId, ct);
        foreach (var membership in memberships)
        {
            var orgSub = await subscriptionRepo.GetEffectiveForOrganizationAsync(membership.OrganizationId, ct);
            if (orgSub?.Plan is not { } orgPlan || orgPlan.IsFree) continue;

            sources.Add($"organization:{membership.OrganizationId}:{orgPlan.Code}");
            isPremium = true;
            // The more generous limit wins; null (unlimited) beats any number.
            if (projectLimit is not null)
                projectLimit = orgPlan.ProjectLimit is null ? null : Math.Max(projectLimit.Value, orgPlan.ProjectLimit.Value);
        }

        if (sources.Count == 0) sources.Add("personal:FREE_PERSONAL");

        var usage = await CountActivePersonalProjectsAsync(userId, ct);
        return new EffectiveEntitlement(planCode, planName, isPremium, projectLimit, usage, null, sources);
    }

    public async Task<EffectiveEntitlement> GetForOrganizationAsync(int organizationId, CancellationToken ct = default)
    {
        var subscription = await subscriptionRepo.GetEffectiveForOrganizationAsync(organizationId, ct);
        var projects = await projectRepo.GetProjectsByOrgIdAsync(organizationId, ct);
        var usage = projects.Count(IsCountedTowardQuota);

        if (subscription?.Plan is { } plan)
        {
            return new EffectiveEntitlement(
                plan.Code, plan.Name, !plan.IsFree, plan.ProjectLimit, usage, plan.MemberLimit,
                [$"organization:{organizationId}:{plan.Code}"]);
        }

        var freePlan = await planRepo.GetByCodeAsync("FREE_ORGANIZATION", ct);
        return new EffectiveEntitlement(
            freePlan?.Code ?? "FREE_ORGANIZATION",
            freePlan?.Name ?? "Free",
            false,
            freePlan?.ProjectLimit ?? DefaultFreeProjectLimit,
            usage,
            freePlan?.MemberLimit,
            ["organization:free"]);
    }

    public async Task EnsureCanCreateProjectAsync(int userId, int? organizationId, CancellationToken ct = default)
    {
        var entitlement = organizationId is int orgId
            ? await GetForOrganizationAsync(orgId, ct)
            : await GetForUserAsync(userId, ct);

        if (entitlement.CanCreateAnotherProject) return;

        throw new PlanUpgradeRequiredException(
            $"Your current plan allows {entitlement.ProjectLimit} active project(s). Upgrade the plan or archive an existing project.",
            entitlement.ProjectLimit,
            entitlement.ProjectUsage);
    }

    private async Task<int> CountActivePersonalProjectsAsync(int userId, CancellationToken ct)
    {
        var projects = await projectRepo.GetProjectsByUserIdAsync(userId, ct);
        return projects.Count(p => p.OrganizationId is null && IsCountedTowardQuota(p));
    }

    /// <summary>Archived/deleted projects free up quota; a project merely marked Completed does not
    /// (rule 3 of the plan).</summary>
    private static bool IsCountedTowardQuota(Project project)
        => !string.Equals(project.Status, "Archived", StringComparison.OrdinalIgnoreCase)
           && !string.Equals(project.Status, "Deleted", StringComparison.OrdinalIgnoreCase);
}
