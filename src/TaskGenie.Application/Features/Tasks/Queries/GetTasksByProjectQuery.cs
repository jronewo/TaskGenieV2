using MediatR;
using TaskGenie.Application.Features.Tasks.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Tasks.Queries;

public sealed record GetTasksByProjectQuery(int ProjectId) : IRequest<List<TaskDetailDto>>;

public sealed class GetTasksByProjectQueryHandler(
    IResourceAuthorizationService authz,
    ITaskRepository taskRepo
) : IRequestHandler<GetTasksByProjectQuery, List<TaskDetailDto>>
{
    public async Task<List<TaskDetailDto>> Handle(GetTasksByProjectQuery query, CancellationToken ct)
    {
        await authz.EnsureCanAccessProjectAsync(query.ProjectId, ct);

        var tasks = await taskRepo.GetByProjectIdWithDetailsAsync(query.ProjectId, ct);
        return tasks.Select(TaskDetailDto.FromEntity).ToList();
    }
}
