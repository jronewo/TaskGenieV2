using TaskGenie.Domain.Entities;
using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Application.Interfaces;

/// <summary>
/// Resource-ownership and tenant-isolation checks. Every method resolves the entity first
/// (throwing NotFoundException if it doesn't exist) then enforces access, throwing
/// ForbiddenException if the current actor isn't allowed. Callers should use the returned
/// entity instead of re-fetching it.
/// </summary>
public interface IResourceAuthorizationService
{
    /// <summary>Read access: PLATFORM_ADMIN, the project creator, any active team member, or
    /// (for an organization project) the organization owner.</summary>
    Task<Project> EnsureCanAccessProjectAsync(int projectId, CancellationToken ct = default);

    /// <summary>Mutate access: PLATFORM_ADMIN, the project creator, or (for an organization
    /// project) the organization owner. Plain team membership is not sufficient.</summary>
    Task<Project> EnsureCanManageProjectAsync(int projectId, CancellationToken ct = default);

    /// <summary>Read access: PLATFORM_ADMIN, the team creator, or any member of the team.</summary>
    Task<Team> EnsureCanAccessTeamAsync(int teamId, CancellationToken ct = default);

    /// <summary>Mutate access (add/remove member, delete): PLATFORM_ADMIN or the team creator only.
    /// Plain membership (including LEADER) is not sufficient.</summary>
    Task<Team> EnsureCanManageTeamAsync(int teamId, CancellationToken ct = default);

    /// <summary>Read access on a task: same as EnsureCanAccessProjectAsync on the task's project.</summary>
    Task<TaskEntity> EnsureCanAccessTaskAsync(int taskId, CancellationToken ct = default);

    /// <summary>Mutate access on a task: PLATFORM_ADMIN, the project creator, the organization
    /// owner (for an organization project), or a LEADER of the project's team. A plain team
    /// member can read the task but not mutate it.</summary>
    Task<TaskEntity> EnsureCanManageTaskAsync(int taskId, CancellationToken ct = default);

    /// <summary>Moving a task between board columns: anyone who can see the project, i.e. any team
    /// member, not just a leader. Reporting progress on your own work is not an administrative act,
    /// and a board where only the leader can drag is a board nobody keeps up to date. Editing,
    /// deleting and assigning still require <see cref="EnsureCanManageTaskAsync"/>.</summary>
    Task<TaskEntity> EnsureCanUpdateTaskStatusAsync(int taskId, CancellationToken ct = default);

    /// <summary>Same rule as EnsureCanManageTaskAsync but for actions that don't have a task yet
    /// (task create) — checked directly against the target project.</summary>
    Task<Project> EnsureCanManageTasksInProjectAsync(int projectId, CancellationToken ct = default);

    /// <summary>
    /// Same rule as <see cref="EnsureCanManageTasksInProjectAsync"/> but answers instead of throwing,
    /// so the UI can disable the create-task controls rather than letting the user earn a 403.
    /// This is a convenience for rendering — it is never a substitute for the enforcing call.
    /// </summary>
    Task<bool> CanManageTasksInProjectAsync(int projectId, CancellationToken ct = default);

    /// <summary>Read access to an organization and its scoped resources (projects, evaluations):
    /// PLATFORM_ADMIN, the organization owner, or any ACTIVE member.</summary>
    Task<Organization> EnsureCanAccessOrganizationAsync(int organizationId, CancellationToken ct = default);

    /// <summary>Manage access (settings, membership, org billing): PLATFORM_ADMIN, the organization
    /// owner, or an ACTIVE member whose role is OWNER/ORG_ADMIN. A plain MEMBER may read but not
    /// manage.</summary>
    Task<Organization> EnsureCanManageOrganizationAsync(int organizationId, CancellationToken ct = default);

    /// <summary>Mutate access to a UserSkill row (update level / remove): PLATFORM_ADMIN or the
    /// user the row belongs to. No one else may edit another user's declared skills.</summary>
    Task<UserSkill> EnsureCanManageUserSkillAsync(int userSkillId, CancellationToken ct = default);

    /// <summary>Guards a resource that belongs to a single user (notifications, score history,
    /// profile, personal evaluations): only that user or a PLATFORM_ADMIN. Synchronous — the
    /// decision needs no database lookup.</summary>
    void EnsureSelfOrPlatformAdmin(int userId);

    /// <summary>Read access to a user's performance history: themselves, a PLATFORM_ADMIN, or a
    /// LEADER of a team the subject belongs to — a leader must see past reviews to write a fair
    /// one. Anyone else is refused.</summary>
    System.Threading.Tasks.Task EnsureCanViewUserPerformanceAsync(int subjectUserId, CancellationToken ct = default);
}
