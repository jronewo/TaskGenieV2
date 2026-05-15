using MediatR;
using TaskGenie.Application.Features.Skills;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Skills.Queries;

public class GetSkillByIdQueryHandler(ISkillRepository skillRepository)
    : IRequestHandler<GetSkillByIdQuery, SkillDto?>
{
    public async Task<SkillDto?> Handle(GetSkillByIdQuery request, CancellationToken ct)
    {
        var skill = await skillRepository.GetByIdAsync(request.SkillId, ct);
        if (skill == null) return null;
        return new SkillDto { SkillId = skill.SkillId, SkillName = skill.SkillName ?? "Unknown Skill" };
    }
}
