using MediatR;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Skills.Commands;

public class UpdateUserSkillLevelCommandHandler(
    IResourceAuthorizationService authorization,
    IUserSkillRepository userSkillRepository)
    : IRequestHandler<UpdateUserSkillLevelCommand, bool>
{
    public async Task<bool> Handle(UpdateUserSkillLevelCommand request, CancellationToken ct)
    {
        var userSkill = await authorization.EnsureCanManageUserSkillAsync(request.UserSkillId, ct);

        userSkill.UpdateLevel(request.NewLevel);
        await userSkillRepository.UpdateAsync(userSkill, ct);
        return true;
    }
}
