using MediatR;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Tasks.Commands;

public sealed record DeleteTaskCommand(int TaskId) : IRequest<bool>;

public sealed class DeleteTaskCommandHandler(
    ITaskRepository taskRepo
) : IRequestHandler<DeleteTaskCommand, bool>
{
    public async Task<bool> Handle(DeleteTaskCommand cmd, CancellationToken ct)
    {
        var task = await taskRepo.GetByIdAsync(cmd.TaskId, ct);
        if (task is null) return false;

        await taskRepo.DeleteAsync(cmd.TaskId, ct);
        return true;
    }
}
