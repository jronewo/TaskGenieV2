using MediatR;
using TaskGenie.Application.Features.AI.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.AI.Queries;

public sealed record GetAiExecutionLogsQuery(int TaskId) : IRequest<List<AiExecutionLogDto>>;

public sealed class GetAiExecutionLogsQueryHandler(IResourceAuthorizationService authz, IRiskRepository repository)
    : IRequestHandler<GetAiExecutionLogsQuery, List<AiExecutionLogDto>>
{
    public async Task<List<AiExecutionLogDto>> Handle(GetAiExecutionLogsQuery query, CancellationToken ct)
    {
        await authz.EnsureCanAccessTaskAsync(query.TaskId, ct);

        var logs = await repository.GetExecutionLogsByTaskIdAsync(query.TaskId, ct);
        return logs.Select(AiExecutionLogDto.FromEntity).ToList();
    }
}
