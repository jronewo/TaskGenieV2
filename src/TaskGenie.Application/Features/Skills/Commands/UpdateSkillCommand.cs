using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Skills;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Skills.Commands;

public sealed record UpdateSkillCommand(int SkillId, string SkillName) : IRequest<SkillDto>;

public sealed class UpdateSkillCommandHandler(ISkillRepository skillRepository)
    : IRequestHandler<UpdateSkillCommand, SkillDto>
{
    public async Task<SkillDto> Handle(UpdateSkillCommand request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.SkillName))
            throw new InvalidOperationException("Skill name is required.");

        var skill = await skillRepository.GetByIdAsync(request.SkillId, ct)
            ?? throw new NotFoundException("Skill", request.SkillId);

        var existing = await skillRepository.GetByNameAsync(request.SkillName, ct);
        if (existing is not null && existing.SkillId != skill.SkillId)
            throw new InvalidOperationException($"A skill named '{request.SkillName}' already exists.");

        skill.Rename(request.SkillName.Trim());
        await skillRepository.UpdateAsync(skill, ct);

        return new SkillDto { SkillId = skill.SkillId, SkillName = skill.SkillName ?? "Unknown Skill", IsActive = skill.IsActive };
    }
}
