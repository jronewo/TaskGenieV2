using MediatR;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Application.Features.Tasks.Commands;

public sealed record AddTaskDependencyCommand(
    int TaskId,
    int DependsOnTaskId
) : IRequest<bool>;

public sealed class AddTaskDependencyCommandHandler(
    ITaskRepository taskRepo,
    ITaskDependencyRepository dependencyRepo
) : IRequestHandler<AddTaskDependencyCommand, bool>
{
    public async Task<bool> Handle(AddTaskDependencyCommand cmd, CancellationToken ct)
    {
        var task = await taskRepo.GetByIdAsync(cmd.TaskId, ct);
        if (task is null) return false;

        var dep = TaskDependency.Create(cmd.TaskId, cmd.DependsOnTaskId);
        await dependencyRepo.AddAsync(dep, ct);
        return true;
    }
}
