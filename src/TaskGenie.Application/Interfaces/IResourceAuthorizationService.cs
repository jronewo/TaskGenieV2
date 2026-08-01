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

    /// <summary>Same rule as EnsureCanManageTaskAsync but for actions that don't have a task yet
    /// (task create) — checked directly against the target project.</summary>
    Task<Project> EnsureCanManageTasksInProjectAsync(int projectId, CancellationToken ct = default);
}
