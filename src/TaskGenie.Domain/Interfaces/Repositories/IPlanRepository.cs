using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface IPlanRepository
{
    System.Threading.Tasks.Task<Plan?> GetByIdAsync(int planId, CancellationToken ct = default);
    System.Threading.Tasks.Task<Plan?> GetByCodeAsync(string code, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<Plan>> GetActiveAsync(string? scope = null, CancellationToken ct = default);

    /// <summary>All plans regardless of IsActive — for the admin plan-management list.</summary>
    System.Threading.Tasks.Task<List<Plan>> GetAllAsync(CancellationToken ct = default);

    System.Threading.Tasks.Task AddAsync(Plan plan, CancellationToken ct = default);
    System.Threading.Tasks.Task UpdateAsync(Plan plan, CancellationToken ct = default);
}
