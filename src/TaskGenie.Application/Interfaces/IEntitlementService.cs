namespace TaskGenie.Application.Interfaces;

/// <summary>Effective plan for an actor, resolved from personal and organization subscriptions.
/// Every quota decision goes through this service — plan logic must never be duplicated in
/// controllers or the UI.</summary>
public record EffectiveEntitlement(
    string PlanCode,
    string PlanName,
    bool IsPremium,
    int? ProjectLimit,
    int ProjectUsage,
    int? MemberLimit,
    IReadOnlyList<string> Sources)
{
    public bool IsUnlimitedProjects => ProjectLimit is null;
    public bool CanCreateAnotherProject => ProjectLimit is null || ProjectUsage < ProjectLimit;
    public int? RemainingProjects => ProjectLimit is null ? null : Math.Max(0, ProjectLimit.Value - ProjectUsage);
}

/// <summary>Thrown when a quota would be exceeded. Maps to HTTP 403 with code
/// <c>PLAN_UPGRADE_REQUIRED</c>.</summary>
public sealed class PlanUpgradeRequiredException(string message, int? limit, int usage) : Exception(message)
{
    public const string Code = "PLAN_UPGRADE_REQUIRED";
    public int? Limit { get; } = limit;
    public int Usage { get; } = usage;
}

public interface IEntitlementService
{
    /// <summary>Effective entitlement for a personal actor: their own subscription, plus Premium
    /// inherited from any organization they are an ACTIVE member of.</summary>
    Task<EffectiveEntitlement> GetForUserAsync(int userId, CancellationToken ct = default);

    /// <summary>Effective entitlement for an organization.</summary>
    Task<EffectiveEntitlement> GetForOrganizationAsync(int organizationId, CancellationToken ct = default);

    /// <summary>Throws <see cref="PlanUpgradeRequiredException"/> when the owner has no project
    /// quota left. <paramref name="organizationId"/> null means a personal project.</summary>
    Task EnsureCanCreateProjectAsync(int userId, int? organizationId, CancellationToken ct = default);
}
