using MediatR;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Tasks.Commands;

public sealed record ReplaceTaskRequiredSkillsCommand(
    int TaskId,
    List<int> SkillIds
) : IRequest<bool>;

public sealed class ReplaceTaskRequiredSkillsCommandHandler(
    IResourceAuthorizationService authz,
    ITaskRequiredSkillRepository skillRepo
) : IRequestHandler<ReplaceTaskRequiredSkillsCommand, bool>
{
    public async Task<bool> Handle(ReplaceTaskRequiredSkillsCommand cmd, CancellationToken ct)
    {
        await authz.EnsureCanManageTaskAsync(cmd.TaskId, ct);

        await skillRepo.ReplaceTaskSkillsAsync(cmd.TaskId, cmd.SkillIds, ct);
        return true;
    }
}
