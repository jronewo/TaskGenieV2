using Microsoft.EntityFrameworkCore;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Services;

public sealed class OrganizationLifecycleService(AppDbContext context) : IOrganizationLifecycleService
{
    public Task<Organization> CreateOrganizationAsync(string name, string? description, int ownerId, CancellationToken ct = default)
    {
        return ExecuteInTransactionAsync(async () =>
        {
            var organization = Organization.Create(name, description, ownerId);
            context.Organizations.Add(organization);
            await context.SaveChangesAsync(ct);

            var owner = OrganizationMember.Create(organization.OrganizationId, ownerId, OrganizationRole.Owner);
            context.OrganizationMembers.Add(owner);
            await context.SaveChangesAsync(ct);

            return organization;
        }, ct);
    }

    private async Task<T> ExecuteInTransactionAsync<T>(Func<Task<T>> operation, CancellationToken ct)
    {
        if (!context.Database.IsRelational())
            return await operation();

        var strategy = context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await context.Database.BeginTransactionAsync(ct);
            try
            {
                var result = await operation();
                await transaction.CommitAsync(ct);
                return result;
            }
            catch
            {
                await transaction.RollbackAsync(ct);
                throw;
            }
        });
    }
}
