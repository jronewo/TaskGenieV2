using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public sealed class TaskTypeRepository(AppDbContext context) : ITaskTypeRepository
{
    public async Task<IReadOnlyList<TaskType>> GetAllAsync(bool includeArchived = false, CancellationToken ct = default)
        => await context.TaskTypes
            .Where(t => includeArchived || t.IsActive)
            .OrderBy(t => t.Name)
            .ToListAsync(ct);

    public async Task<TaskType?> GetByIdAsync(int taskTypeId, CancellationToken ct = default)
        => await context.TaskTypes.SingleOrDefaultAsync(t => t.TaskTypeId == taskTypeId, ct);
}
