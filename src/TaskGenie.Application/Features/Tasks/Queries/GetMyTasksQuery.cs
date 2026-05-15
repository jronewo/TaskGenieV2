using MediatR;
using TaskGenie.Application.Features.Tasks.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Tasks.Queries;

public sealed record GetMyTasksQuery(int UserId) : IRequest<List<TaskDetailDto>>;

public sealed class GetMyTasksQueryHandler(
    ITaskRepository taskRepo
) : IRequestHandler<GetMyTasksQuery, List<TaskDetailDto>>
{
    public async Task<List<TaskDetailDto>> Handle(GetMyTasksQuery query, CancellationToken ct)
    {
        var tasks = await taskRepo.GetByAssigneeAsync(query.UserId, ct);
        return tasks.Select(TaskDetailDto.FromEntity).ToList();
    }
}
