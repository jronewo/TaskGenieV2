using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.BackgroundJobs;

/// <summary>
/// Finishes what a soft-delete started. Deleting a project only ever marks it Deleted — it hides
/// immediately and frees its quota slot, but every row underneath it stays intact so the action is
/// recoverable for a grace period. This worker is what actually makes the delete permanent once that
/// period has elapsed, running the same cascading hard-delete the delete endpoint used to run inline.
///
/// A plain BackgroundService rather than Hangfire or Quartz — the schedule is "look at the clock
/// every hour", which needs no job store, no dashboard and no extra dependency, matching
/// SubscriptionLifecycleWorker/RiskAutomationWorker.
/// </summary>
public sealed class ProjectPurgeWorker(
    IServiceScopeFactory scopeFactory,
    IOptions<ProjectPurgeOptions> options,
    ILogger<ProjectPurgeWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var settings = options.Value;
        if (!settings.Enabled)
        {
            logger.LogInformation("Project purge worker is disabled by configuration.");
            return;
        }

        await Task.Delay(TimeSpan.FromSeconds(settings.StartupDelaySeconds), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunOnceAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                // One bad sweep must not kill the worker for the lifetime of the process.
                logger.LogError(ex, "Project purge sweep failed; will retry on the next tick.");
            }

            await Task.Delay(TimeSpan.FromMinutes(settings.IntervalMinutes), stoppingToken);
        }
    }

    /// <summary>Exposed so a test can drive one sweep without waiting on the timer.</summary>
    public async Task RunOnceAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var lifecycle = scope.ServiceProvider.GetRequiredService<IProjectLifecycleService>();
        var settings = options.Value;

        var cutoff = DateTime.UtcNow.AddDays(-settings.GraceDays);

        var due = await db.Projects
            .Where(p => p.Status == Project.DeletedStatus && p.UpdatedAt != null && p.UpdatedAt <= cutoff)
            .ToListAsync(ct);

        if (due.Count == 0) return;

        foreach (var project in due)
        {
            try
            {
                // Each project's cascade runs in its own transaction (ProjectLifecycleService), so
                // one failure here never leaves a half-purged project — it just retries next sweep.
                await lifecycle.DeleteProjectAsync(project, ct);
                logger.LogInformation(
                    "Purged project {ProjectId}, deleted {DaysAgo:F0} day(s) ago.",
                    project.ProjectId, (DateTime.UtcNow - project.UpdatedAt!.Value).TotalDays);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to purge project {ProjectId}; will retry next sweep.", project.ProjectId);
            }
        }
    }
}

public sealed class ProjectPurgeOptions
{
    public const string SectionName = "ProjectPurge";

    /// <summary>Turned off in tests so a sweep never races the assertions.</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>How often to look at the clock. Hourly is plenty for a day-granularity grace period.</summary>
    public int IntervalMinutes { get; set; } = 60;

    /// <summary>How many days a soft-deleted project stays recoverable before it is purged for real.</summary>
    public int GraceDays { get; set; } = 30;

    public int StartupDelaySeconds { get; set; } = 25;
}
