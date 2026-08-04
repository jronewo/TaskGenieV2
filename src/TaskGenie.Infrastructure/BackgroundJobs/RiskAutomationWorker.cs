using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TaskGenie.Application.Features.AI.Commands;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.BackgroundJobs;

/// <summary>
/// Re-runs the risk estimate for every project whose scheduled hour has arrived.
///
/// The estimate is the one number people plan around, and until now it only ever refreshed when
/// somebody remembered to press "Risk estimate" — so a board could sit on a week-old reading.
/// Each project picks its own hour: the AI provider is rate-limited, and a single global sweep
/// would fire every project's tasks at once and trip the quota.
///
/// The tick is hourly and the "already ran today" check lives on the project row, so a restart,
/// a redeploy or a second instance cannot run the same project twice in a day.
/// </summary>
public sealed class RiskAutomationWorker(
    IServiceScopeFactory scopeFactory,
    IOptions<RiskAutomationOptions> options,
    ILogger<RiskAutomationWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var settings = options.Value;
        if (!settings.Enabled)
        {
            logger.LogInformation("Risk automation worker is disabled by configuration.");
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
                logger.LogError(ex, "Risk automation sweep failed; will retry on the next tick.");
            }

            await Task.Delay(TimeSpan.FromMinutes(settings.IntervalMinutes), stoppingToken);
        }
    }

    /// <summary>Exposed so a test can drive one sweep without waiting on the timer.</summary>
    public async Task RunOnceAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();
        var settings = options.Value;

        var now = DateTime.UtcNow;

        // Filtered in SQL as far as the shape allows; the "already ran today" comparison finishes
        // in memory because it depends on the current date rather than a stored one.
        var candidates = await db.Projects
            .Where(p => p.RiskAutomationHourUtc != null && p.Status != "Completed")
            .ToListAsync(ct);

        var due = candidates.Where(p => p.IsRiskAutomationDue(now)).ToList();
        if (due.Count == 0) return;

        foreach (var project in due)
        {
            var taskIds = await db.Tasks
                .Where(t => t.ProjectId == project.ProjectId && t.Status != "Done")
                .OrderBy(t => t.TaskId)
                .Select(t => t.TaskId)
                .Take(settings.MaxTasksPerProject)
                .ToListAsync(ct);

            var analysed = 0;
            foreach (var taskId in taskIds)
            {
                if (ct.IsCancellationRequested) break;
                try
                {
                    // Sequential on purpose: the provider is rate-limited and a burst would trip
                    // the quota, exactly as the manual sweep in the board header does.
                    await mediator.Send(new AnalyzeTaskRiskCommand(taskId, SystemInitiated: true), ct);
                    analysed++;
                }
                catch (Exception ex)
                {
                    // One task failing must not abandon the rest of the project.
                    logger.LogWarning(ex, "Scheduled risk estimate failed for task {TaskId}.", taskId);
                }
            }

            // Stamped whatever happened, so a provider outage cannot make the sweep retry every
            // hour for the rest of the day.
            project.MarkRiskAutomationRun(now);
            logger.LogInformation(
                "Scheduled risk estimate for project {ProjectId}: {Analysed}/{Total} task(s) re-scored.",
                project.ProjectId, analysed, taskIds.Count);
        }

        await db.SaveChangesAsync(ct);
    }
}

public sealed class RiskAutomationOptions
{
    public const string SectionName = "RiskAutomation";

    /// <summary>Turned off in tests so a sweep never races the assertions.</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>Hourly: the schedule has hour granularity, so a finer tick buys nothing.</summary>
    public int IntervalMinutes { get; set; } = 60;

    /// <summary>Ceiling per project per run, so one huge board cannot consume the AI quota alone.</summary>
    public int MaxTasksPerProject { get; set; } = 50;

    public int StartupDelaySeconds { get; set; } = 30;
}
