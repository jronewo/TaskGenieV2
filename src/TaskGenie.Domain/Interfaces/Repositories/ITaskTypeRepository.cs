using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface ITaskTypeRepository
{
    /// <summary><paramref name="includeArchived"/> is for administration; the picker only shows active.</summary>
    Task<IReadOnlyList<TaskType>> GetAllAsync(bool includeArchived = false, CancellationToken ct = default);

    Task<TaskType?> GetByIdAsync(int taskTypeId, CancellationToken ct = default);
}
