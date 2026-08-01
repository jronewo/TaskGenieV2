using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Skills.Commands;

public class UpdateUserSkillLevelCommandHandler(IUserSkillRepository userSkillRepository, ICurrentUser currentUser)
    : IRequestHandler<UpdateUserSkillLevelCommand, bool>
{
    public async Task<bool> Handle(UpdateUserSkillLevelCommand request, CancellationToken ct)
    {
        var userSkill = await userSkillRepository.GetByIdAsync(request.UserSkillId, ct)
            ?? throw new NotFoundException("UserSkill", request.UserSkillId);

        // Self-service only — not even a platform admin may edit another user's skill levels.
        if (userSkill.UserId != currentUser.UserId)
            throw new ForbiddenException("You can only update your own skills.");

        userSkill.UpdateLevel(request.NewLevel);
        await userSkillRepository.UpdateAsync(userSkill, ct);
        return true;
    }
}
