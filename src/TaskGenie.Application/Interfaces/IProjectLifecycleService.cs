using TaskGenie.Domain.Entities;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Application.Interfaces;

/// <summary>
/// Owns the atomic Project + dedicated-Team lifecycle so a project's team, initial leader
/// membership, and eventual cleanup never partially fail or leave orphans. A team is only
/// auto-deleted when it was created purely to back a project (Team.IsProjectManaged) AND no
/// other project still references it — a standalone/shared team is never touched.
/// </summary>
public interface IProjectLifecycleService
{
    /// <summary>Creates Team (IsProjectManaged=true) + initial LEADER TeamMember + Project as one
    /// atomic unit.</summary>
    Task<Project> CreateProjectWithDedicatedTeamAsync(
        string name,
        string? description,
        int createdBy,
        int? organizationId,
        DateOnly? deadline,
        CancellationToken ct = default);

    /// <summary>Hard-deletes the project — the cascade through every table hanging off it, then the
    /// project row itself and, if its team is project-managed and no longer referenced by any other
    /// project, that team's invitations, members, and the team row too. Called by the API only via
    /// the purge worker once a soft-deleted project's grace period has elapsed; a user-initiated
    /// delete goes through <see cref="SoftDeleteProjectAsync"/> instead.</summary>
    Task DeleteProjectAsync(Project project, CancellationToken ct = default);

    /// <summary>User-facing "delete": marks the project Deleted so it disappears from every list and
    /// frees its quota slot immediately, without touching a single row underneath it. The real
    /// cascade only happens once the grace period elapses (see <see cref="DeleteProjectAsync"/>).</summary>
    Task SoftDeleteProjectAsync(Project project, CancellationToken ct = default);

    /// <summary>Undoes a soft-delete within its grace period: the project reappears everywhere and
    /// claims its quota slot back immediately.</summary>
    Task RestoreProjectAsync(Project project, CancellationToken ct = default);

    /// <summary>Persists an already-mutated project (see Project.Update) and, if TeamId changed
    /// away from a project-managed team no longer referenced by any other project, cleans up the
    /// old team's invitations/members/row. All in one transaction.</summary>
    Task UpdateProjectAsync(Project project, int? previousTeamId, CancellationToken ct = default);
}
