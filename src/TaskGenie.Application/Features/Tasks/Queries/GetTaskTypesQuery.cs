using MediatR;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Tasks.Queries;

public sealed record TaskTypeDto(int TaskTypeId, string Code, string Name, string? ColorHex, bool IsActive);

/// <summary>The catalog the create-task form offers. Archived types stay out of the picker.</summary>
public sealed record GetTaskTypesQuery(bool IncludeArchived = false) : IRequest<IReadOnlyList<TaskTypeDto>>;

public sealed class GetTaskTypesQueryHandler(ITaskTypeRepository repo)
    : IRequestHandler<GetTaskTypesQuery, IReadOnlyList<TaskTypeDto>>
{
    public async Task<IReadOnlyList<TaskTypeDto>> Handle(GetTaskTypesQuery query, CancellationToken ct)
    {
        var types = await repo.GetAllAsync(query.IncludeArchived, ct);
        return types.Select(t => new TaskTypeDto(t.TaskTypeId, t.Code, t.Name, t.ColorHex, t.IsActive)).ToList();
    }
}
