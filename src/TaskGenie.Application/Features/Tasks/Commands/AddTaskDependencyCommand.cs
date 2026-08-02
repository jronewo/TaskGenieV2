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

        var dep = TaskDependency.Create(cmd.TaskId, cmd.DependsOnTaskId);
        await dependencyRepo.AddAsync(dep, ct);
        return true;
    }
}
