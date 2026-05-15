using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Skills.Commands;

public class UpdateUserSkillLevelCommandHandler(IUserSkillRepository userSkillRepository)
    : IRequestHandler<UpdateUserSkillLevelCommand, bool>
{
    public async Task<bool> Handle(UpdateUserSkillLevelCommand request, CancellationToken ct)
    {
        var userSkill = await userSkillRepository.GetByIdAsync(request.UserSkillId, ct)
            ?? throw new NotFoundException("UserSkill", request.UserSkillId);

        userSkill.UpdateLevel(request.NewLevel);
        await userSkillRepository.UpdateAsync(userSkill, ct);
        return true;
    }
}
