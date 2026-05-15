using Microsoft.EntityFrameworkCore;
using TaskGenie.Application.Features.Admin;
using TaskGenie.Infrastructure.Persistence;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class TaskStatsRepository(AppDbContext context) : ITaskStatsRepository
{
    public async Task<(int Total, int Done)> GetTotalAndDoneCountAsync(CancellationToken ct = default)
    {
        var total = await context.Tasks.CountAsync(ct);
        var done = await context.Tasks.CountAsync(t => t.Status == "Done", ct);
        return (total, done);
    }
}
