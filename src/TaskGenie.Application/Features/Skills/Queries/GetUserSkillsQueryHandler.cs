using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Skills;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Skills.Queries;

public class GetUserSkillsQueryHandler(IUserSkillRepository userSkillRepository, ICurrentUser currentUser)
    : IRequestHandler<GetUserSkillsQuery, List<UserSkillDto>>
{
    public async Task<List<UserSkillDto>> Handle(GetUserSkillsQuery request, CancellationToken ct)
    {
        // Self view or platform admin view — an admin may look, but (per
        // AddUserSkillCommand/UpdateUserSkillLevelCommand/RemoveUserSkillCommand) may never
        // mutate another user's skills.
        if (request.UserId != currentUser.UserId && !currentUser.IsPlatformAdmin)
            throw new ForbiddenException("You can only view your own skills.");

        var userSkills = await userSkillRepository.GetByUserIdAsync(request.UserId, ct);
        return userSkills.Select(us => new UserSkillDto
        {
            Id = us.Id,
            UserId = us.UserId ?? 0,
            UserName = us.User?.Name,
            SkillId = us.SkillId ?? 0,
            SkillName = us.Skill?.SkillName,
            Level = us.Level
        }).ToList();
    }
}
