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
        if (string.IsNullOrWhiteSpace(request.SkillName))
            throw new InvalidOperationException("Skill name is required.");

        var existing = await skillRepository.GetByNameAsync(request.SkillName, ct);
        if (existing != null)
            throw new InvalidOperationException($"A skill named '{request.SkillName}' already exists.");

        var skill = Skill.Create(request.SkillName.Trim());
        await skillRepository.AddAsync(skill, ct);
        return new SkillDto { SkillId = skill.SkillId, SkillName = skill.SkillName ?? "Unknown Skill", IsActive = skill.IsActive };
    }
}
