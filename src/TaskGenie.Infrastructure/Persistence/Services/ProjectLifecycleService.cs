using Microsoft.EntityFrameworkCore;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Services;

public sealed class ProjectLifecycleService(AppDbContext context) : IProjectLifecycleService
{
    public Task<Project> CreateProjectWithDedicatedTeamAsync(
        string name,
        string? description,
        int createdBy,
        int? organizationId,
        DateOnly? deadline,
        CancellationToken ct = default)
    {
        return ExecuteInTransactionAsync(async () =>
        {
            var team = Team.Create(
                name: $"Team Project: {name}",
                description: $"Team for project {name}",
                createdBy: createdBy,
                isProjectManaged: true);
            context.Teams.Add(team);
            await context.SaveChangesAsync(ct);

            var leader = TeamMember.Create(team.TeamId, createdBy, "LEADER");
            context.TeamMembers.Add(leader);

            var project = Project.Create(name, description, createdBy, organizationId, deadline);
            project.SetTeamId(team.TeamId);
            context.Projects.Add(project);
            await context.SaveChangesAsync(ct);

            return project;
        }, ct);
    }

    public Task DeleteProjectAsync(Project project, CancellationToken ct = default)
    {
        return ExecuteInTransactionAsync(async () =>
        {
            var teamId = project.TeamId;

            context.Projects.Remove(project);
            await context.SaveChangesAsync(ct);

            if (teamId.HasValue)
                await CleanupTeamIfOrphanedAsync(teamId.Value, ct);

            return true;
        }, ct);
    }

    public Task UpdateProjectAsync(Project project, int? previousTeamId, CancellationToken ct = default)
    {
        return ExecuteInTransactionAsync(async () =>
        {
            context.Projects.Update(project);
            await context.SaveChangesAsync(ct);

            if (previousTeamId.HasValue && previousTeamId != project.TeamId)
                await CleanupTeamIfOrphanedAsync(previousTeamId.Value, ct);

            return true;
        }, ct);
    }

    /// <summary>Deletes a team's invitations, members, and the team row itself — but only if the
    /// team was auto-created for a project (IsProjectManaged) and no project references it anymore.
    /// A standalone/shared team, or one still in use by another project, is left untouched.</summary>
    private async Task CleanupTeamIfOrphanedAsync(int teamId, CancellationToken ct)
    {
        var team = await context.Teams.FirstOrDefaultAsync(t => t.TeamId == teamId, ct);
        if (team is null || !team.IsProjectManaged) return;

        var stillReferencedByAnotherProject = await context.Projects.AnyAsync(p => p.TeamId == teamId, ct);
        if (stillReferencedByAnotherProject) return;

        var members = await context.TeamMembers.Where(m => m.TeamId == teamId).ToListAsync(ct);
        context.TeamMembers.RemoveRange(members);

        var invitations = await context.Invitations.Where(i => i.TeamId == teamId).ToListAsync(ct);
        context.Invitations.RemoveRange(invitations);

        context.Teams.Remove(team);
        await context.SaveChangesAsync(ct);
    }

    /// <summary>Wraps the operation in a real DB transaction (with SQL Server's execution strategy
    /// for retry-safety) on relational providers. The EF Core InMemory provider used by the
    /// automated test suite does not support transactions at all, so there we just run the
    /// operation directly — its own SaveChanges calls remain the only durability guarantee there.</summary>
    private async Task<T> ExecuteInTransactionAsync<T>(Func<Task<T>> operation, CancellationToken ct)
    {
        if (!context.Database.IsRelational())
            return await operation();

        var strategy = context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await context.Database.BeginTransactionAsync(ct);
            try
            {
                var result = await operation();
                await transaction.CommitAsync(ct);
                return result;
            }
            catch
            {
                await transaction.RollbackAsync(ct);
                throw;
            }
        });
    }
}
