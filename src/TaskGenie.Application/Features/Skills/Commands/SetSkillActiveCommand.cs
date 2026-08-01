using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Skills;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Skills.Commands;

/// <summary>Activates or deactivates a skill. Skills are never hard-deleted through this
/// path — a skill already referenced by TaskRequiredSkills/UserSkills must remain resolvable
/// for existing tasks/profiles; deactivation only hides it from new assignments.</summary>
public sealed record SetSkillActiveCommand(int SkillId, bool IsActive) : IRequest<SkillDto>;

public sealed class SetSkillActiveCommandHandler(ISkillRepository skillRepository)
    : IRequestHandler<SetSkillActiveCommand, SkillDto>
{
    public async Task<SkillDto> Handle(SetSkillActiveCommand request, CancellationToken ct)
    {
        var skill = await skillRepository.GetByIdAsync(request.SkillId, ct)
            ?? throw new NotFoundException("Skill", request.SkillId);

        if (request.IsActive) skill.Activate();
        else skill.Deactivate();

        await skillRepository.UpdateAsync(skill, ct);
        return new SkillDto { SkillId = skill.SkillId, SkillName = skill.SkillName ?? "Unknown Skill", IsActive = skill.IsActive };
    }
}
