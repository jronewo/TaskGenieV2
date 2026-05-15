using MediatR;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Tasks.Commands;

public sealed record RemoveTaskDependencyCommand(
    int TaskId,
    int DependencyId
) : IRequest<bool>;

public sealed class RemoveTaskDependencyCommandHandler(
    ITaskRepository taskRepo,
    ITaskDependencyRepository dependencyRepo
) : IRequestHandler<RemoveTaskDependencyCommand, bool>
{
    public async Task<bool> Handle(RemoveTaskDependencyCommand cmd, CancellationToken ct)
    {
        var task = await taskRepo.GetByIdAsync(cmd.TaskId, ct);
        if (task is null) return false;

        var dep = await dependencyRepo.GetByIdAsync(cmd.DependencyId, ct);
        if (dep is null || dep.TaskId != cmd.TaskId) return false;

        await dependencyRepo.DeleteAsync(cmd.DependencyId, ct);
        return true;
    }
}
