using Microsoft.EntityFrameworkCore;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Services;

public sealed class TeamLifecycleService(AppDbContext context) : ITeamLifecycleService
{
    public Task<Team> CreateTeamAsync(string name, string? description, int createdBy, CancellationToken ct = default)
    {
        return ExecuteInTransactionAsync(async () =>
        {
            var team = Team.Create(name, description, createdBy);
            context.Teams.Add(team);
            await context.SaveChangesAsync(ct);

            var leader = TeamMember.Create(team.TeamId, createdBy, "LEADER");
            context.TeamMembers.Add(leader);
            await context.SaveChangesAsync(ct);

            return team;
        }, ct);
    }

    public Task DeleteTeamAsync(Team team, CancellationToken ct = default)
    {
        return ExecuteInTransactionAsync(async () =>
        {
            var referencedByProject = await context.Projects.AnyAsync(p => p.TeamId == team.TeamId, ct);
            if (referencedByProject)
                throw new InvalidOperationException(
                    "This team is still assigned to a project and cannot be deleted. Reassign or delete the project(s) first.");

            var members = await context.TeamMembers.Where(m => m.TeamId == team.TeamId).ToListAsync(ct);
            context.TeamMembers.RemoveRange(members);

            var invitations = await context.Invitations.Where(i => i.TeamId == team.TeamId).ToListAsync(ct);
            context.Invitations.RemoveRange(invitations);

            context.Teams.Remove(team);
            await context.SaveChangesAsync(ct);
        }, ct);
    }

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

    private async Task ExecuteInTransactionAsync(Func<Task> operation, CancellationToken ct)
    {
        if (!context.Database.IsRelational())
        {
            await operation();
            return;
        }

        var strategy = context.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await context.Database.BeginTransactionAsync(ct);
            try
            {
                await operation();
                await transaction.CommitAsync(ct);
            }
            catch
            {
                await transaction.RollbackAsync(ct);
                throw;
            }
        });
    }
}
