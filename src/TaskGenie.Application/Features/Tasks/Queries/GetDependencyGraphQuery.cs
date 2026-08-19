using MediatR;
using TaskGenie.Application.Features.Tasks.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Tasks.Queries;

public sealed record GetDependencyGraphQuery(int ProjectId) : IRequest<DependencyGraphDto>;

/// <summary>
/// The project's tasks arranged by what has to finish first.
///
/// The ordering is a longest-path layering rather than a plain topological sort: a task sits one
/// level below its *latest* prerequisite, so everything on the same level can genuinely be worked
/// in parallel. That is the question the diagram exists to answer — what can start now, and what
/// is waiting on what.
/// </summary>
public sealed class GetDependencyGraphQueryHandler(
    IResourceAuthorizationService authz,
    ITaskRepository taskRepo,
    ITaskDependencyRepository dependencyRepo
) : IRequestHandler<GetDependencyGraphQuery, DependencyGraphDto>
{
    public async Task<DependencyGraphDto> Handle(GetDependencyGraphQuery query, CancellationToken ct)
    {
        await authz.EnsureCanAccessProjectAsync(query.ProjectId, ct);

        var tasks = await taskRepo.GetByProjectIdWithDetailsAsync(query.ProjectId, ct);
        // One query for the whole project. Asking per task turned a single screen into N round trips.
        var dependencies = await dependencyRepo.GetByProjectIdAsync(query.ProjectId, ct);

        var taskIds = tasks.Select(t => t.TaskId).ToHashSet();
        // A dependency pointing outside the project cannot be drawn and must not skew the levels.
        var edges = dependencies
            .Where(d => taskIds.Contains(d.TaskId) && taskIds.Contains(d.DependsOnTaskId))
            .ToList();

        var prerequisites = edges
            .GroupBy(d => d.TaskId)
            .ToDictionary(g => g.Key, g => g.Select(d => d.DependsOnTaskId).Distinct().ToList());

        var levels = ComputeLevels(taskIds, prerequisites, out var inCycle);

        var doneIds = tasks
            .Where(t => string.Equals(t.Status, TaskStatuses.Done, StringComparison.OrdinalIgnoreCase))
            .Select(t => t.TaskId)
            .ToHashSet();

        var blocksCount = edges
            .GroupBy(d => d.DependsOnTaskId)
            .ToDictionary(g => g.Key, g => g.Select(d => d.TaskId).Distinct().Count());

        var nodes = tasks.Select(t =>
        {
            var openPrereqs = prerequisites.TryGetValue(t.TaskId, out var ps)
                ? ps.Count(id => !doneIds.Contains(id))
                : 0;
            var isDone = doneIds.Contains(t.TaskId);

            return new GraphNodeDto
            {
                Id = t.TaskId.ToString(),
                Title = t.Title ?? "Untitled",
                Status = t.Status,
                Priority = t.Priority,
                Deadline = t.Deadline?.ToString("yyyy-MM-dd"),
                AssigneeName = t.TaskAssignees.FirstOrDefault()?.User?.Name,
                Level = levels.TryGetValue(t.TaskId, out var lv) ? lv : 0,
                BlockedByCount = openPrereqs,
                BlocksCount = blocksCount.TryGetValue(t.TaskId, out var bc) ? bc : 0,
                IsReady = !isDone && openPrereqs == 0 && !inCycle.Contains(t.TaskId),
                InCycle = inCycle.Contains(t.TaskId),
            };
        }).ToList();

        return new DependencyGraphDto
        {
            Nodes = nodes,
            Edges = edges.Select(d => new GraphEdgeDto
            {
                Id = $"e_{d.DependsOnTaskId}_{d.TaskId}",
                Source = d.DependsOnTaskId.ToString(),
                Target = d.TaskId.ToString(),
                IsBlocking = !doneIds.Contains(d.DependsOnTaskId),
            }).ToList(),
            HasCycle = inCycle.Count > 0,
            LevelCount = nodes.Count == 0 ? 0 : nodes.Max(n => n.Level) + 1,
        };
    }

    /// <summary>
    /// Kahn's algorithm, keeping the deepest level reached for each task. Whatever is left when the
    /// queue empties belongs to a loop — those tasks never lose their last incoming edge — so this
    /// both orders the graph and names the tasks that can never be completed.
    /// </summary>
    private static Dictionary<int, int> ComputeLevels(
        HashSet<int> taskIds,
        Dictionary<int, List<int>> prerequisites,
        out HashSet<int> inCycle)
    {
        var remaining = taskIds.ToDictionary(
            id => id,
            id => prerequisites.TryGetValue(id, out var ps) ? ps.Count : 0);

        var dependents = new Dictionary<int, List<int>>();
        foreach (var (taskId, prereqs) in prerequisites)
        {
            foreach (var prereq in prereqs)
            {
                if (!dependents.TryGetValue(prereq, out var list))
                    dependents[prereq] = list = new List<int>();
                list.Add(taskId);
            }
        }

        var levels = taskIds.ToDictionary(id => id, _ => 0);
        var queue = new Queue<int>(remaining.Where(kv => kv.Value == 0).Select(kv => kv.Key));
        var settled = new HashSet<int>();

        while (queue.Count > 0)
        {
            var current = queue.Dequeue();
            settled.Add(current);

            if (!dependents.TryGetValue(current, out var waiting)) continue;
            foreach (var next in waiting)
            {
                // A task sits below its *latest* prerequisite, not its first.
                levels[next] = Math.Max(levels[next], levels[current] + 1);
                if (--remaining[next] == 0) queue.Enqueue(next);
            }
        }

        inCycle = taskIds.Where(id => !settled.Contains(id)).ToHashSet();
        return levels;
    }
}
