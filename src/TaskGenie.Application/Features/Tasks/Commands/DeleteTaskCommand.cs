using MediatR;
using TaskGenie.Application.Interfaces;

namespace TaskGenie.Application.Features.Tasks.Commands;

public sealed record DeleteTaskCommand(int TaskId) : IRequest<bool>;

public sealed class DeleteTaskCommandHandler(
    IResourceAuthorizationService authz,
    ITaskLifecycleService lifecycle
) : IRequestHandler<DeleteTaskCommand, bool>
{
    public async Task<bool> Handle(DeleteTaskCommand cmd, CancellationToken ct)
    {
        var task = await authz.EnsureCanManageTaskAsync(cmd.TaskId, ct);
        await lifecycle.DeleteTaskAsync(task, ct);
        return true;
    }
}
