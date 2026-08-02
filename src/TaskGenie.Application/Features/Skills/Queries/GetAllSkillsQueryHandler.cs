using MediatR;
using TaskGenie.Application.Features.Skills;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Skills.Queries;

public class GetAllSkillsQueryHandler(ISkillRepository skillRepository)
    : IRequestHandler<GetAllSkillsQuery, List<SkillDto>>
{
    public async Task<List<SkillDto>> Handle(GetAllSkillsQuery request, CancellationToken ct)
    {
        var skills = await skillRepository.GetAllAsync(ct);
        // Ordinary users only ever see the live catalog; archived skills stay visible to admins
        // through /api/skills/admin.
        return skills.Where(s => s.IsActive).Select(s => new SkillDto
        {
            SkillId = s.SkillId,
            SkillName = s.SkillName ?? "Unknown Skill"
        }).ToList();
    }
}
