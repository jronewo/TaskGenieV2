using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Skills.Commands;

public class RemoveUserSkillCommandHandler(IUserSkillRepository userSkillRepository, ICurrentUser currentUser)
    : IRequestHandler<RemoveUserSkillCommand, bool>
{
    public async Task<bool> Handle(RemoveUserSkillCommand request, CancellationToken ct)
    {
        var userSkill = await userSkillRepository.GetByIdAsync(request.UserSkillId, ct);
        if (userSkill is null) return true;

        // Self-service only — not even a platform admin may remove another user's skill.
        if (userSkill.UserId != currentUser.UserId)
            throw new ForbiddenException("You can only remove your own skills.");

        await userSkillRepository.DeleteAsync(request.UserSkillId, ct);
        return true;
    }
}
