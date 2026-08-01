using MediatR;
using TaskGenie.Application.Features.Skills;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Skills.Queries;

public class GetAllSkillsQueryHandler(ISkillRepository skillRepository, ICurrentUser currentUser)
    : IRequestHandler<GetAllSkillsQuery, List<SkillDto>>
{
    public async Task<List<SkillDto>> Handle(GetAllSkillsQuery request, CancellationToken ct)
    {
        var skills = await skillRepository.GetAllAsync(ct);

        // Deactivated skills are hidden from the general catalog (e.g. task-required-skill or
        // self-service skill pickers) — only the dedicated admin listing shows everything.
        if (!currentUser.IsPlatformAdmin)
            skills = skills.Where(s => s.IsActive).ToList();

        return skills.Select(s => new SkillDto
        {
            SkillId = s.SkillId,
            SkillName = s.SkillName ?? "Unknown Skill",
            IsActive = s.IsActive
        }).ToList();
    }
}
