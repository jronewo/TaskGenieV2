using MediatR;
using TaskGenie.Application.Features.Skills;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Skills.Commands;

public class CreateSkillCommandHandler(ISkillRepository skillRepository)
    : IRequestHandler<CreateSkillCommand, SkillDto>
{
    public async Task<SkillDto> Handle(CreateSkillCommand request, CancellationToken ct)
    {
        var existing = await skillRepository.GetByNameAsync(request.SkillName, ct);
        if (existing != null)
            return new SkillDto { SkillId = existing.SkillId, SkillName = existing.SkillName ?? "Unknown Skill" };

        var skill = Skill.Create(request.SkillName);
        await skillRepository.AddAsync(skill, ct);
        return new SkillDto { SkillId = skill.SkillId, SkillName = skill.SkillName ?? "Unknown Skill" };
    }
}
