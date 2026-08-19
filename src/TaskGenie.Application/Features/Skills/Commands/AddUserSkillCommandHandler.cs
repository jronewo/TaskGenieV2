using MediatR;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Skills.Commands;

public class AddUserSkillCommandHandler(
    ICurrentUser currentUser,
    IUserSkillRepository userSkillRepository)
    : IRequestHandler<AddUserSkillCommand, bool>
{
    public async Task<bool> Handle(AddUserSkillCommand request, CancellationToken ct)
    {
        var existing = await userSkillRepository.GetByUserIdAsync(currentUser.UserId, ct);
        if (existing.Any(us => us.SkillId == request.SkillId))
            return false;

        var userSkill = UserSkill.Create(currentUser.UserId, request.SkillId, request.Level);
        await userSkillRepository.AddAsync(userSkill, ct);
        return true;
    }
}
