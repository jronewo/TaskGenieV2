using MediatR;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Skills.Commands;

public class RemoveUserSkillCommandHandler(IUserSkillRepository userSkillRepository)
    : IRequestHandler<RemoveUserSkillCommand, bool>
{
    public async Task<bool> Handle(RemoveUserSkillCommand request, CancellationToken ct)
    {
        await userSkillRepository.DeleteAsync(request.UserSkillId, ct);
        return true;
    }
}
