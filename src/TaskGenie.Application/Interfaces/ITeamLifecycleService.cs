using TaskGenie.Domain.Entities;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Application.Interfaces;

/// <summary>Owns atomic Team lifecycle. A team still referenced by any project can never be
/// deleted (the project's Update/Delete flows own that cleanup — see IProjectLifecycleService).
/// Otherwise deletes the team's invitations, members, and the team row itself as one unit.</summary>
public interface ITeamLifecycleService
{
    /// <summary>Creates a standalone Team plus its creator's initial LEADER membership as one
    /// atomic unit.</summary>
    Task<Team> CreateTeamAsync(string name, string? description, int createdBy, CancellationToken ct = default);

    Task DeleteTeamAsync(Team team, CancellationToken ct = default);
}
