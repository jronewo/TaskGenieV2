using MediatR;
using TaskGenie.Application.Features.Skills;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Skills.Queries;

public class GetUserSkillsQueryHandler(IUserSkillRepository userSkillRepository)
    : IRequestHandler<GetUserSkillsQuery, List<UserSkillDto>>
{
    public async Task<List<UserSkillDto>> Handle(GetUserSkillsQuery request, CancellationToken ct)
    {
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
