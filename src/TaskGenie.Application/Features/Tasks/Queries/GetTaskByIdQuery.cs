using MediatR;
using TaskGenie.Application.Features.Tasks.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Tasks.Queries;

public sealed record GetTaskByIdQuery(int TaskId) : IRequest<TaskDetailDto?>;

public sealed class GetTaskByIdQueryHandler(
    ITaskRepository taskRepo
) : IRequestHandler<GetTaskByIdQuery, TaskDetailDto?>
{
    public async Task<TaskDetailDto?> Handle(GetTaskByIdQuery query, CancellationToken ct)
    {
        var task = await taskRepo.GetByIdWithDetailsAsync(query.TaskId, ct);
        return task is not null ? TaskDetailDto.FromEntity(task) : null;
    }
}
