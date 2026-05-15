using MediatR;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Skills.Commands;

public class AddUserSkillCommandHandler(IUserSkillRepository userSkillRepository)
    : IRequestHandler<AddUserSkillCommand, bool>
{
    public async Task<bool> Handle(AddUserSkillCommand request, CancellationToken ct)
    {
        var existing = await userSkillRepository.GetByUserIdAsync(request.UserId, ct);
        if (existing.Any(us => us.SkillId == request.SkillId))
            return false;

        var userSkill = UserSkill.Create(request.UserId, request.SkillId, request.Level);
        await userSkillRepository.AddAsync(userSkill, ct);
        return true;
    }
}
