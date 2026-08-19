using FluentValidation;
using MediatR;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Tasks.Commands;

/// <summary>One skill a task needs, and how good at it the assignee should be (1–5).</summary>
public sealed record TaskSkillRequirementInput(int SkillId, int RequiredLevel);

public sealed record ReplaceTaskRequiredSkillsCommand(
    int TaskId,
    List<TaskSkillRequirementInput> Skills
) : IRequest<bool>;

public sealed class ReplaceTaskRequiredSkillsCommandValidator : AbstractValidator<ReplaceTaskRequiredSkillsCommand>
{
    public ReplaceTaskRequiredSkillsCommandValidator()
    {
        RuleForEach(c => c.Skills).ChildRules(skill =>
        {
            skill.RuleFor(s => s.SkillId).GreaterThan(0).WithMessage("skillId must be a real skill.");
            skill.RuleFor(s => s.RequiredLevel)
                .InclusiveBetween(1, 5)
                .WithMessage("requiredLevel must be between 1 and 5.");
        });

        RuleFor(c => c.Skills)
            .Must(skills => skills.Select(s => s.SkillId).Distinct().Count() == skills.Count)
            .WithMessage("The same skill cannot be required twice.");
    }
}

public sealed class ReplaceTaskRequiredSkillsCommandHandler(
    IResourceAuthorizationService authz,
    ITaskRequiredSkillRepository skillRepo
) : IRequestHandler<ReplaceTaskRequiredSkillsCommand, bool>
{
    public async Task<bool> Handle(ReplaceTaskRequiredSkillsCommand cmd, CancellationToken ct)
    {
        await authz.EnsureCanManageTaskAsync(cmd.TaskId, ct);

        await skillRepo.ReplaceTaskSkillsAsync(
            cmd.TaskId,
            cmd.Skills.Select(s => (s.SkillId, s.RequiredLevel)).ToList(),
            ct);

        return true;
    }
}
