using MediatR;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Skills.Commands;

public class RemoveUserSkillCommandHandler(
    IResourceAuthorizationService authorization,
    IUserSkillRepository userSkillRepository)
    : IRequestHandler<RemoveUserSkillCommand, bool>
{
    public async Task<bool> Handle(RemoveUserSkillCommand request, CancellationToken ct)
    {
        var userSkill = await authorization.EnsureCanManageUserSkillAsync(request.UserSkillId, ct);
        await userSkillRepository.DeleteAsync(userSkill.Id, ct);
        return true;
    }
}
