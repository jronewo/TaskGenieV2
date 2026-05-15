using MediatR;
using TaskGenie.Application.Features.Tasks.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Tasks.Queries;

public sealed record GetTaskProgressLogsQuery(int TaskId) : IRequest<List<TaskLogDto>>;

public sealed class GetTaskProgressLogsQueryHandler(
    ITaskLogRepository taskLogRepo
) : IRequestHandler<GetTaskProgressLogsQuery, List<TaskLogDto>>
{
    public async Task<List<TaskLogDto>> Handle(GetTaskProgressLogsQuery query, CancellationToken ct)
    {
        var logs = await taskLogRepo.GetByTaskIdAsync(query.TaskId, ct);
        return logs
            .OrderByDescending(l => l.CreatedAt)
            .Select(TaskLogDto.FromEntity)
            .ToList();
    }
}
