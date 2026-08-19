using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Skills;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Application.Features.Skills.Commands;

public sealed record AdminSkillDto(int SkillId, string SkillName, bool IsActive);

// ── Admin catalog listing (includes archived) ────────────────────────────────────────

public sealed record AdminListSkillsQuery(string? Search, bool? IsActive) : IRequest<List<AdminSkillDto>>;

public sealed class AdminListSkillsQueryHandler(ISkillRepository skillRepo)
    : IRequestHandler<AdminListSkillsQuery, List<AdminSkillDto>>
{
    public async Task<List<AdminSkillDto>> Handle(AdminListSkillsQuery query, CancellationToken ct)
    {
        var skills = await skillRepo.GetAllAsync(ct);
        var filtered = skills.AsEnumerable();

        if (!string.IsNullOrWhiteSpace(query.Search))
            filtered = filtered.Where(s => (s.SkillName ?? "").Contains(query.Search, StringComparison.OrdinalIgnoreCase));
        if (query.IsActive.HasValue)
            filtered = filtered.Where(s => s.IsActive == query.IsActive.Value);

        return filtered
            .OrderBy(s => s.SkillName)
            .Select(s => new AdminSkillDto(s.SkillId, s.SkillName, s.IsActive))
            .ToList();
    }
}

// ── Rename ───────────────────────────────────────────────────────────────────────────

public sealed record UpdateSkillCommand(int SkillId, string SkillName) : IRequest<AdminSkillDto>;

public sealed class UpdateSkillCommandHandler(ISkillRepository skillRepo)
    : IRequestHandler<UpdateSkillCommand, AdminSkillDto>
{
    public async Task<AdminSkillDto> Handle(UpdateSkillCommand cmd, CancellationToken ct)
    {
        var skill = await skillRepo.GetByIdAsync(cmd.SkillId, ct)
            ?? throw new NotFoundException("Skill", cmd.SkillId);

        var name = cmd.SkillName.Trim();
        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("Skill name is required.");

        // Names are unique after normalisation, so two skills can't collide on case/whitespace.
        var duplicate = await skillRepo.GetByNameAsync(name, ct);
        if (duplicate is not null && duplicate.SkillId != cmd.SkillId)
            throw new InvalidOperationException($"A skill named '{name}' already exists.");

        skill.Rename(name);
        await skillRepo.UpdateAsync(skill, ct);
        return new AdminSkillDto(skill.SkillId, skill.SkillName, skill.IsActive);
    }
}

// ── Archive / restore (never hard delete) ────────────────────────────────────────────

public sealed record SetSkillActiveCommand(int SkillId, bool IsActive) : IRequest<AdminSkillDto>;

public sealed class SetSkillActiveCommandHandler(ISkillRepository skillRepo)
    : IRequestHandler<SetSkillActiveCommand, AdminSkillDto>
{
    public async Task<AdminSkillDto> Handle(SetSkillActiveCommand cmd, CancellationToken ct)
    {
        var skill = await skillRepo.GetByIdAsync(cmd.SkillId, ct)
            ?? throw new NotFoundException("Skill", cmd.SkillId);

        skill.SetActive(cmd.IsActive);
        await skillRepo.UpdateAsync(skill, ct);
        return new AdminSkillDto(skill.SkillId, skill.SkillName, skill.IsActive);
    }
}

// ── The caller's own skills ──────────────────────────────────────────────────────────

public sealed record GetMySkillsQuery : IRequest<List<UserSkillDto>>;

public sealed class GetMySkillsQueryHandler(
    ICurrentUser currentUser,
    IUserSkillRepository userSkillRepo)
    : IRequestHandler<GetMySkillsQuery, List<UserSkillDto>>
{
    public async Task<List<UserSkillDto>> Handle(GetMySkillsQuery query, CancellationToken ct)
    {
        var userSkills = await userSkillRepo.GetByUserIdAsync(currentUser.UserId, ct);
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
