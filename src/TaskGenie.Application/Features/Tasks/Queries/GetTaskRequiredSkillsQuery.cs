using MediatR;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Tasks.Queries;

public sealed record TaskRequiredSkillDto(int Id, int SkillId, string? SkillName, int RequiredLevel);

public sealed record GetTaskRequiredSkillsQuery(int TaskId) : IRequest<List<TaskRequiredSkillDto>>;

public sealed class GetTaskRequiredSkillsQueryHandler(
    IResourceAuthorizationService authz,
    ITaskRequiredSkillRepository skillRepo
) : IRequestHandler<GetTaskRequiredSkillsQuery, List<TaskRequiredSkillDto>>
{
    public async Task<List<TaskRequiredSkillDto>> Handle(GetTaskRequiredSkillsQuery query, CancellationToken ct)
    {
        await authz.EnsureCanAccessTaskAsync(query.TaskId, ct);

        var skills = await skillRepo.GetByTaskIdAsync(query.TaskId, ct);
        return skills.Select(s => new TaskRequiredSkillDto(s.Id, s.SkillId ?? 0, s.Skill?.SkillName, s.RequiredLevel ?? 1)).ToList();
    }
}
