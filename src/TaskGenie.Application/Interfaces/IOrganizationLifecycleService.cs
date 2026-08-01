using TaskGenie.Domain.Entities;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Application.Interfaces;

/// <summary>Owns the atomic Organization + creator's initial OWNER membership lifecycle, so a
/// created organization is never left without an OWNER row in the membership roster.</summary>
public interface IOrganizationLifecycleService
{
    Task<Organization> CreateOrganizationAsync(string name, string? description, int ownerId, CancellationToken ct = default);
}
