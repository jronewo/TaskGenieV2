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
        var aiChatbot = false;
        DateTime? periodEnd = null;

        var personal = await subscriptionRepo.GetEffectiveForUserAsync(userId, ct);
        if (personal?.Plan is { } personalPlan)
        {
            sources.Add($"personal:{personalPlan.Code}");
            planCode = personalPlan.Code;
            planName = personalPlan.Name;
            projectLimit = personalPlan.ProjectLimit;
            isPremium = !personalPlan.IsFree;
            aiChatbot = personalPlan.AiChatbotEnabled;
            periodEnd = personal.CurrentPeriodEnd;
        }
        else
        {
            var freePlan = await planRepo.GetByCodeAsync("FREE_PERSONAL", ct);
            projectLimit = freePlan?.ProjectLimit ?? DefaultFreeProjectLimit;
            if (freePlan is not null)
            {
                planName = freePlan.Name;
                aiChatbot = freePlan.AiChatbotEnabled;
            }
        }

        // Premium may also be inherited from any organization the user actively belongs to.
        // Inheritance never mutates the user's own plan — it is recomputed on every call, which is
        // what makes it disappear by itself the moment the organization's subscription lapses.
        var canUseOrganizations = false;
        var memberships = await memberRepo.GetActiveByUserAsync(userId, ct);
        foreach (var membership in memberships)
        {
            var orgSub = await subscriptionRepo.GetEffectiveForOrganizationAsync(membership.OrganizationId, ct);
            if (orgSub?.Plan is not { } orgPlan || orgPlan.IsFree) continue;

            sources.Add($"organization:{membership.OrganizationId}:{orgPlan.Code}");
            isPremium = true;
            canUseOrganizations = true;
            if (orgPlan.AiChatbotEnabled) aiChatbot = true;
            // The later of the two period ends is what the user actually keeps access until.
            if (orgSub.CurrentPeriodEnd is { } orgEnd && (periodEnd is null || orgEnd > periodEnd))
                periodEnd = orgEnd;
            // The more generous limit wins; null (unlimited) beats any number.
            if (projectLimit is not null)
                projectLimit = orgPlan.ProjectLimit is null ? null : Math.Max(projectLimit.Value, orgPlan.ProjectLimit.Value);
        }

        if (sources.Count == 0) sources.Add("personal:FREE_PERSONAL");

        var usage = await CountActivePersonalProjectsAsync(userId, ct);
        return new EffectiveEntitlement(
            planCode, planName, isPremium, projectLimit, usage, null, sources,
            aiChatbot, periodEnd, canUseOrganizations);
    }

    public async Task<EffectiveEntitlement> GetForOrganizationAsync(int organizationId, CancellationToken ct = default)
    {
        var subscription = await subscriptionRepo.GetEffectiveForOrganizationAsync(organizationId, ct);
        var projects = await projectRepo.GetProjectsByOrgIdAsync(organizationId, ct);
        var usage = projects.Count(IsCountedTowardQuota);

        if (subscription?.Plan is { } plan && !plan.IsFree)
        {
            return new EffectiveEntitlement(
                plan.Code, plan.Name, true, plan.ProjectLimit, usage, plan.MemberLimit,
                [$"organization:{organizationId}:{plan.Code}"],
                plan.AiChatbotEnabled, subscription.CurrentPeriodEnd, CanUseOrganizations: true);
        }

        // No free tier for organizations: an organization is a paid feature, so one without an
        // active paid subscription grants nothing at all. A zero project limit is what makes
        // EnsureCanCreateProjectAsync refuse rather than silently allowing two "free" projects —
        // the previous FREE_ORGANIZATION fallback is why an unpaid organization still worked.
        return new EffectiveEntitlement(
            PlanCode: "NONE",
            PlanName: "Chưa có gói",
            IsPremium: false,
            ProjectLimit: 0,
            ProjectUsage: usage,
            MemberLimit: 0,
            Sources: [],
            AiChatbotEnabled: false,
            CurrentPeriodEnd: null,
            CanUseOrganizations: false);
    }

    public async Task EnsureCanCreateProjectAsync(int userId, int? organizationId, CancellationToken ct = default)
    {
        var entitlement = organizationId is int orgId
            ? await GetForOrganizationAsync(orgId, ct)
            : await GetForUserAsync(userId, ct);

        if (entitlement.CanCreateAnotherProject) return;

        // An organization with no paid plan has a limit of zero, which needs its own sentence —
        // "allows 0 active projects" reads like a bug rather than "you have not paid yet".
        var message = organizationId is not null && entitlement.ProjectLimit == 0
            ? "Tổ chức chưa có gói đăng ký đang hoạt động. Hãy thanh toán gói tổ chức để tạo dự án."
            : $"Gói hiện tại cho phép {entitlement.ProjectLimit} dự án ({entitlement.ProjectUsage}/{entitlement.ProjectLimit} đã dùng). "
              + "Nâng cấp gói, hoặc xoá bớt dự án cho đến khi còn dưới hạn mức rồi tạo lại.";

        throw new PlanUpgradeRequiredException(message, entitlement.ProjectLimit, entitlement.ProjectUsage);
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
