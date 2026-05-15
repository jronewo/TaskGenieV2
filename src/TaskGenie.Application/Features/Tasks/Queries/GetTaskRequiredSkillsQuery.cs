using MediatR;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Tasks.Queries;

public sealed record TaskRequiredSkillDto(int Id, int SkillId, string? SkillName);

public sealed record GetTaskRequiredSkillsQuery(int TaskId) : IRequest<List<TaskRequiredSkillDto>>;

public sealed class GetTaskRequiredSkillsQueryHandler(
    ITaskRequiredSkillRepository skillRepo
) : IRequestHandler<GetTaskRequiredSkillsQuery, List<TaskRequiredSkillDto>>
{
    public async Task<List<TaskRequiredSkillDto>> Handle(GetTaskRequiredSkillsQuery query, CancellationToken ct)
    {
        var skills = await skillRepo.GetByTaskIdAsync(query.TaskId, ct);
        return skills.Select(s => new TaskRequiredSkillDto(s.Id, s.SkillId ?? 0, s.Skill?.SkillName)).ToList();
    }
}
