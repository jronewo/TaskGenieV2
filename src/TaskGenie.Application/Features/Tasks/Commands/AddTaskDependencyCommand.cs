using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Application.Features.Tasks.Commands;

public sealed record AddTaskDependencyCommand(
    int TaskId,
    int DependsOnTaskId
) : IRequest<bool>;

public sealed class AddTaskDependencyCommandHandler(
    IResourceAuthorizationService authz,
    ITaskRepository taskRepo,
    ITaskDependencyRepository dependencyRepo
) : IRequestHandler<AddTaskDependencyCommand, bool>
{
    public async Task<bool> Handle(AddTaskDependencyCommand cmd, CancellationToken ct)
    {
        var task = await authz.EnsureCanManageTaskAsync(cmd.TaskId, ct);

        if (cmd.DependsOnTaskId == cmd.TaskId)
            throw new InvalidOperationException("A task cannot depend on itself.");

        var dependsOnTask = await taskRepo.GetByIdAsync(cmd.DependsOnTaskId, ct)
            ?? throw new NotFoundException("Task", cmd.DependsOnTaskId);

        if (dependsOnTask.ProjectId != task.ProjectId)
            throw new InvalidOperationException("A task can only depend on another task in the same project.");

        var existingDependencies = await dependencyRepo.GetByTaskIdAsync(cmd.TaskId, ct);
        if (existingDependencies.Any(d => d.DependsOnTaskId == cmd.DependsOnTaskId))
            throw new InvalidOperationException("This dependency already exists.");

        if (task.ProjectId is int projectId
            && await WouldCreateCycleAsync(projectId, cmd.TaskId, cmd.DependsOnTaskId, ct))
        {
            throw new InvalidOperationException(
                "That would create a circular dependency: the task you selected already waits on this one, "
                + "directly or through others. Neither could ever be completed.");
        }

        var dep = TaskDependency.Create(cmd.TaskId, cmd.DependsOnTaskId);
        await dependencyRepo.AddAsync(dep, ct);
        return true;
    }

    /// <summary>
    /// Whether adding "task waits on dependsOn" closes a loop.
    ///
    /// A cycle is not a cosmetic problem: a task may only move to Done once every dependency is
    /// Done, so two tasks waiting on each other can never be finished by anyone. Nothing prevented
    /// this before — A→B then B→A was accepted and deadlocked both.
    ///
    /// The check walks *forward* from the proposed prerequisite: if the new prerequisite already
    /// depends on the task (at any depth), the edge would close a loop.
    /// </summary>
    private async Task<bool> WouldCreateCycleAsync(
        int projectId, int taskId, int dependsOnTaskId, CancellationToken ct)
    {
        var all = await dependencyRepo.GetByProjectIdAsync(projectId, ct);

        // taskId -> the tasks it waits on.
        var waitsOn = all
            .GroupBy(d => d.TaskId)
            .ToDictionary(g => g.Key, g => g.Select(d => d.DependsOnTaskId).ToList());

        var seen = new HashSet<int>();
        var stack = new Stack<int>();
        stack.Push(dependsOnTaskId);

        while (stack.Count > 0)
        {
            var current = stack.Pop();
            if (current == taskId) return true;
            if (!seen.Add(current)) continue;
            if (!waitsOn.TryGetValue(current, out var next)) continue;
            foreach (var n in next) stack.Push(n);
        }

        return false;
    }
}
