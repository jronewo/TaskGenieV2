using MediatR;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Tasks.Commands;

public sealed record ReplaceTaskRequiredSkillsCommand(
    int TaskId,
    List<int> SkillIds
) : IRequest<bool>;

public sealed class ReplaceTaskRequiredSkillsCommandHandler(
    ITaskRepository taskRepo,
    ITaskRequiredSkillRepository skillRepo
) : IRequestHandler<ReplaceTaskRequiredSkillsCommand, bool>
{
    public async Task<bool> Handle(ReplaceTaskRequiredSkillsCommand cmd, CancellationToken ct)
    {
        var task = await taskRepo.GetByIdAsync(cmd.TaskId, ct);
        if (task is null) return false;

        await skillRepo.ReplaceTaskSkillsAsync(cmd.TaskId, cmd.SkillIds, ct);
        return true;
    }
}
