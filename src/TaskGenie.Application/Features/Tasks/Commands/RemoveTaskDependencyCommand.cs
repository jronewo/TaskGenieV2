using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Tasks.Commands;

public sealed record RemoveTaskDependencyCommand(
    int TaskId,
    int DependencyId
) : IRequest<bool>;

public sealed class RemoveTaskDependencyCommandHandler(
    IResourceAuthorizationService authz,
    ITaskDependencyRepository dependencyRepo
) : IRequestHandler<RemoveTaskDependencyCommand, bool>
{
    public async Task<bool> Handle(RemoveTaskDependencyCommand cmd, CancellationToken ct)
    {
        await authz.EnsureCanManageTaskAsync(cmd.TaskId, ct);

        var dep = await dependencyRepo.GetByIdAsync(cmd.DependencyId, ct);
        if (dep is null || dep.TaskId != cmd.TaskId)
            throw new NotFoundException("TaskDependency", cmd.DependencyId);

        await dependencyRepo.DeleteAsync(cmd.DependencyId, ct);
        return true;
    }
}
