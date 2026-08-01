using System.Linq;
using TaskGenie.Application.Features.Subscriptions.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Application.Common.Services;

/// <summary>Hardcoded fallback used only when a subscriber (user or organization) has never
/// had a Subscription row created for them yet. Seeded Plan rows (FREE_PERSONAL /
/// FREE_ORGANIZATION) carry the authoritative limit; this constant is a defensive backstop
/// in case that seed data is ever missing, so quota enforcement never silently opens up.</summary>
public sealed class SubscriptionEntitlementService(
    ISubscriptionRepository subscriptionRepo,
    IPlanRepository planRepo,
    IProjectRepository projectRepo,
    IOrganizationMemberRepository organizationMemberRepo
) : ISubscriptionEntitlementService
{
    private const int FallbackFreeProjectLimit = 2;
    private const string FallbackFreePersonalCode = "FREE_PERSONAL";
    private const string FallbackFreeOrganizationCode = "FREE_ORGANIZATION";

    public async Task<Subscription?> GetActiveSubscriptionForUserAsync(int userId, CancellationToken ct = default)
    {
        var subscription = await subscriptionRepo.GetLatestForUserAsync(userId, ct);
        return subscription is { IsCurrentlyActive: true } ? subscription : null;
    }

    public async Task<Subscription?> GetActiveSubscriptionForOrganizationAsync(int organizationId, CancellationToken ct = default)
    {
        var subscription = await subscriptionRepo.GetLatestForOrganizationAsync(organizationId, ct);
        return subscription is { IsCurrentlyActive: true } ? subscription : null;
    }

    public async Task<EntitlementDto> GetPersonalEntitlementAsync(int userId, CancellationToken ct = default)
    {
        var active = await GetActiveSubscriptionForUserAsync(userId, ct);
        var projects = await projectRepo.GetProjectsByUserIdAsync(userId, ct);
        var personalProjectCount = projects.Count(p => p.OrganizationId is null);

        if (active is not null)
            return BuildEntitlement(active, personalProjectCount);

        var fallbackPlan = await planRepo.GetByCodeAsync(FallbackFreePersonalCode, ct);
        return BuildFallbackEntitlement(fallbackPlan, personalProjectCount);
    }

    public async Task<EntitlementDto> GetOrganizationEntitlementAsync(int organizationId, CancellationToken ct = default)
    {
        var active = await GetActiveSubscriptionForOrganizationAsync(organizationId, ct);
        var projects = await projectRepo.GetProjectsByOrgIdAsync(organizationId, ct);
        var orgProjectCount = projects.Count;

        if (active is not null)
            return BuildEntitlement(active, orgProjectCount);

        var fallbackPlan = await planRepo.GetByCodeAsync(FallbackFreeOrganizationCode, ct);
        return BuildFallbackEntitlement(fallbackPlan, orgProjectCount);
    }

    public async Task<bool> IsOrganizationMemberPremiumAsync(int organizationId, int userId, CancellationToken ct = default)
    {
        var membership = await organizationMemberRepo.GetMembershipAsync(organizationId, userId, ct);
        if (membership is null) return false;

        var active = await GetActiveSubscriptionForOrganizationAsync(organizationId, ct);
        return active is not null && active.Plan.PriceCents > 0;
    }

    public async Task EnsureCanCreatePersonalProjectAsync(int userId, CancellationToken ct = default)
    {
        var entitlement = await GetPersonalEntitlementAsync(userId, ct);
        if (!entitlement.CanCreateProject)
            throw new InvalidOperationException(
                $"Personal project quota reached ({entitlement.CurrentProjectCount}/{entitlement.ProjectLimit}) on the {entitlement.PlanName} plan. Upgrade to create more projects.");
    }

    public async Task EnsureCanCreateOrganizationProjectAsync(int organizationId, CancellationToken ct = default)
    {
        var entitlement = await GetOrganizationEntitlementAsync(organizationId, ct);
        if (!entitlement.CanCreateProject)
            throw new InvalidOperationException(
                $"Organization project quota reached ({entitlement.CurrentProjectCount}/{entitlement.ProjectLimit}) on the {entitlement.PlanName} plan. Upgrade to create more projects.");
    }

    private static EntitlementDto BuildEntitlement(Subscription subscription, int currentProjectCount)
    {
        var limit = subscription.Plan.ProjectLimit;
        var isUnlimited = !limit.HasValue;
        var remaining = isUnlimited ? (int?)null : Math.Max(0, limit!.Value - currentProjectCount);

        return new EntitlementDto
        {
            PlanCode = subscription.Plan.Code,
            PlanName = subscription.Plan.Name,
            IsUnlimited = isUnlimited,
            ProjectLimit = limit,
            CurrentProjectCount = currentProjectCount,
            RemainingProjects = remaining,
            CanCreateProject = isUnlimited || currentProjectCount < limit!.Value,
            SubscriptionStatus = subscription.Status,
            CurrentPeriodEnd = subscription.CurrentPeriodEnd,
            ActiveSubscriptionId = subscription.SubscriptionId
        };
    }

    private static EntitlementDto BuildFallbackEntitlement(Plan? fallbackPlan, int currentProjectCount)
    {
        var limit = fallbackPlan?.ProjectLimit ?? FallbackFreeProjectLimit;
        var planCode = fallbackPlan?.Code ?? FallbackFreePersonalCode;
        var planName = fallbackPlan?.Name ?? "Free";

        return new EntitlementDto
        {
            PlanCode = planCode,
            PlanName = planName,
            IsUnlimited = false,
            ProjectLimit = limit,
            CurrentProjectCount = currentProjectCount,
            RemainingProjects = Math.Max(0, limit - currentProjectCount),
            CanCreateProject = currentProjectCount < limit,
            SubscriptionStatus = "None",
            CurrentPeriodEnd = null,
            ActiveSubscriptionId = null
        };
    }
}
