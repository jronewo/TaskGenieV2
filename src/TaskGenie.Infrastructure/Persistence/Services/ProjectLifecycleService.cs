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

            await DeleteProjectContentAsync(project.ProjectId, ct);

            context.Projects.Remove(project);
            await context.SaveChangesAsync(ct);

            if (teamId.HasValue)
                await CleanupTeamIfOrphanedAsync(teamId.Value, ct);

            return true;
        }, ct);
    }

    /// <summary>
    /// Removes everything hanging off a project before the project row itself goes.
    ///
    /// Most of these tables carry no cascading FK, so deleting only the project used to leave the
    /// comments, assignments, embeddings, AI analyses and score rows of its tasks behind — rows
    /// pointing at task ids that no longer exist. They were invisible in the UI but still counted
    /// in reports and still came back from any query that joined on the id.
    ///
    /// Order matters: children before parents, and the whole thing runs inside the caller's
    /// transaction, so a failure halfway leaves the project intact rather than half-deleted.
    /// </summary>
    private async Task DeleteProjectContentAsync(int projectId, CancellationToken ct)
    {
        var taskIds = await context.Tasks
            .Where(t => t.ProjectId == projectId)
            .Select(t => t.TaskId)
            .ToListAsync(ct);

        if (taskIds.Count > 0)
        {
            // Dependencies are removed from both directions: a task outside this project may still
            // be waiting on one inside it, and that edge would otherwise dangle.
            context.TaskDependencies.RemoveRange(
                await context.TaskDependencies
                    .Where(d => taskIds.Contains(d.TaskId) || taskIds.Contains(d.DependsOnTaskId))
                    .ToListAsync(ct));

            context.TaskAssignees.RemoveRange(
                await context.TaskAssignees.Where(a => a.TaskId != null && taskIds.Contains(a.TaskId.Value)).ToListAsync(ct));
            context.TaskComments.RemoveRange(
                await context.TaskComments.Where(c => c.TaskId != null && taskIds.Contains(c.TaskId.Value)).ToListAsync(ct));
            context.TaskLogs.RemoveRange(
                await context.TaskLogs.Where(l => l.TaskId != null && taskIds.Contains(l.TaskId.Value)).ToListAsync(ct));
            context.TaskRequiredSkills.RemoveRange(
                await context.TaskRequiredSkills.Where(s => s.TaskId != null && taskIds.Contains(s.TaskId.Value)).ToListAsync(ct));
            context.TaskEmbeddings.RemoveRange(
                await context.TaskEmbeddings.Where(e => taskIds.Contains(e.TaskId)).ToListAsync(ct));
            context.TaskEvidences.RemoveRange(
                await context.TaskEvidences.Where(e => taskIds.Contains(e.TaskId)).ToListAsync(ct));
            context.Attachments.RemoveRange(
                await context.Attachments.Where(a => taskIds.Contains(a.TaskId)).ToListAsync(ct));

            context.AiAnalyses.RemoveRange(
                await context.AiAnalyses.Where(a => a.TaskId != null && taskIds.Contains(a.TaskId.Value)).ToListAsync(ct));
            context.AiRecommendations.RemoveRange(
                await context.AiRecommendations.Where(r => r.TaskId != null && taskIds.Contains(r.TaskId.Value)).ToListAsync(ct));
            context.AiExecutionLogs.RemoveRange(
                await context.AiExecutionLogs.Where(l => l.TaskId != null && taskIds.Contains(l.TaskId.Value)).ToListAsync(ct));

            // The polymorphic activity feed has no FK at all, so nothing else would ever clean it.
            context.ActivityLogs.RemoveRange(
                await context.ActivityLogs
                    .Where(l => l.EntityType == "TASK" && l.EntityId != null && taskIds.Contains(l.EntityId.Value))
                    .ToListAsync(ct));

            await context.SaveChangesAsync(ct);
        }

        // Rows keyed on the task *or* the project — risk history and scores are written at both levels.
        context.RiskScoreHistories.RemoveRange(
            await context.RiskScoreHistories
                .Where(h => taskIds.Contains(h.TaskId) || h.ProjectId == projectId)
                .ToListAsync(ct));
        context.UserScores.RemoveRange(
            await context.UserScores
                .Where(s => (s.TaskId != null && taskIds.Contains(s.TaskId.Value)) || s.ProjectId == projectId)
                .ToListAsync(ct));

        // Project-level children.
        var meetingIds = await context.Meetings
            .Where(m => m.ProjectId == projectId)
            .Select(m => m.MeetingId)
            .ToListAsync(ct);
        if (meetingIds.Count > 0)
        {
            context.MeetingAttendees.RemoveRange(
                await context.MeetingAttendees.Where(a => meetingIds.Contains(a.MeetingId)).ToListAsync(ct));
            context.Meetings.RemoveRange(
                await context.Meetings.Where(m => m.ProjectId == projectId).ToListAsync(ct));
        }

        context.ProjectEvaluations.RemoveRange(
            await context.ProjectEvaluations.Where(e => e.ProjectId == projectId).ToListAsync(ct));
        context.Notifications.RemoveRange(
            await context.Notifications.Where(n => n.ProjectId == projectId).ToListAsync(ct));
        context.ActivityLogs.RemoveRange(
            await context.ActivityLogs
                .Where(l => l.EntityType == "PROJECT" && l.EntityId == projectId)
                .ToListAsync(ct));

        await context.SaveChangesAsync(ct);

        // Last, now that nothing points at them.
        context.Tasks.RemoveRange(await context.Tasks.Where(t => t.ProjectId == projectId).ToListAsync(ct));
        await context.SaveChangesAsync(ct);
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
