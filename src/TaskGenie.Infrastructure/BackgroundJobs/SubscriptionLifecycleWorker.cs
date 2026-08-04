using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TaskGenie.Application.Common.Options;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.BackgroundJobs;

/// <summary>
/// Keeps subscription state honest over time and warns people before they lose access.
///
/// Entitlements already ignore a subscription whose period has ended, so access was never actually
/// leaked — but the row stayed <c>ACTIVE</c> for ever, which made every admin report wrong, and
/// nobody was ever told their plan was about to lapse. This worker fixes both: it flips lapsed rows
/// to <c>EXPIRED</c>, and it sends one warning a week ahead and one on the day.
///
/// A plain <see cref="BackgroundService"/> rather than Hangfire or Quartz — the schedule is "look
/// at the clock every hour", which needs no job store, no dashboard and no extra dependency.
/// </summary>
public sealed class SubscriptionLifecycleWorker(
    IServiceScopeFactory scopeFactory,
    IOptions<SubscriptionLifecycleOptions> options,
    ILogger<SubscriptionLifecycleWorker> logger) : BackgroundService
{
    public const string ExpiringSoonType = "SUBSCRIPTION_EXPIRING";
    public const string ExpiredType = "SUBSCRIPTION_EXPIRED";
    private const string SubscriptionReference = "SUBSCRIPTION";

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var settings = options.Value;
        if (!settings.Enabled)
        {
            logger.LogInformation("Subscription lifecycle worker is disabled by configuration.");
            return;
        }

        // A short delay lets the app finish starting (and migrations finish) before the first sweep.
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
                logger.LogError(ex, "Subscription lifecycle sweep failed; will retry on the next tick.");
            }

            await Task.Delay(TimeSpan.FromMinutes(settings.IntervalMinutes), stoppingToken);
        }
    }

    /// <summary>Exposed so a test can drive one sweep without waiting on the timer.</summary>
    public async Task RunOnceAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var email = scope.ServiceProvider.GetRequiredService<IEmailSender>();
        var urls = scope.ServiceProvider.GetRequiredService<IOptions<AppUrlSettings>>().Value;
        var settings = options.Value;

        var now = DateTime.UtcNow;
        var warnFrom = now.AddDays(settings.WarnDaysBefore);

        var subscriptions = await db.Subscriptions
            .Include(s => s.Plan)
            .Where(s => s.Status == SubscriptionStatuses.Active
                        && s.CurrentPeriodEnd != null
                        && s.CurrentPeriodEnd <= warnFrom)
            .ToListAsync(ct);

        if (subscriptions.Count == 0) return;

        foreach (var subscription in subscriptions)
        {
            var periodEnd = subscription.CurrentPeriodEnd!.Value;
            var lapsed = periodEnd <= now;

            var recipients = await ResolveRecipientsAsync(db, subscription, ct);
            var planName = subscription.Plan?.Name ?? subscription.Plan?.Code ?? "gói đăng ký";

            if (lapsed)
            {
                subscription.Expire();
                logger.LogInformation(
                    "Subscription {SubscriptionId} expired on {PeriodEnd:o}; entitlements have already lapsed.",
                    subscription.SubscriptionId, periodEnd);
            }

            var daysRemaining = lapsed ? 0 : Math.Max(1, (int)Math.Ceiling((periodEnd - now).TotalDays));
            var type = lapsed ? ExpiredType : ExpiringSoonType;
            var title = lapsed ? $"Gói {planName} đã hết hạn" : $"Gói {planName} sắp hết hạn";
            var message = lapsed
                ? $"Gói {planName} đã hết hạn ngày {periodEnd:dd/MM/yyyy}. Tài khoản trở về gói miễn phí: "
                  + "tối đa 2 dự án, không dùng được trợ lý AI, tính năng tổ chức bị ẩn. Gia hạn để dùng lại."
                : $"Gói {planName} sẽ hết hạn sau {daysRemaining} ngày (ngày {periodEnd:dd/MM/yyyy}). "
                  + "Gia hạn trước thời điểm này để không mất dự án tổ chức và trợ lý AI.";

            foreach (var recipient in recipients)
            {
                // One notice per subscription per stage. The notification row is the dedupe record,
                // so no extra column is needed and a restart cannot re-send what was already sent.
                var alreadySent = await db.Notifications.AnyAsync(
                    n => n.UserId == recipient.UserId
                         && n.Type == type
                         && n.ReferenceType == SubscriptionReference
                         && n.ReferenceId == subscription.SubscriptionId,
                    ct);
                if (alreadySent) continue;

                db.Notifications.Add(Notification.Create(
                    recipient.UserId, type, title, message,
                    referenceId: subscription.SubscriptionId,
                    referenceType: SubscriptionReference));

                if (!string.IsNullOrWhiteSpace(recipient.Email))
                {
                    try
                    {
                        await email.SendSubscriptionExpiryEmailAsync(
                            recipient.Email!, planName, daysRemaining, periodEnd, urls.BuildSubscriptionUrl(), ct);
                    }
                    catch (Exception ex)
                    {
                        // The in-app notification is the channel that must not be lost; a mail
                        // provider being down is not a reason to skip it or to retry for ever.
                        logger.LogWarning(ex,
                            "Could not email the subscription notice to {UserId}; the in-app notification still stands.",
                            recipient.UserId);
                    }
                }
            }
        }

        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Who hears about it: the subscriber for a personal plan, the organization's owner for an
    /// organization plan — they are the one who can actually pay to renew it.
    /// </summary>
    private static async Task<List<(int UserId, string? Email)>> ResolveRecipientsAsync(
        AppDbContext db, Subscription subscription, CancellationToken ct)
    {
        if (subscription.UserId is int userId)
        {
            var email = await db.Users.Where(u => u.UserId == userId).Select(u => u.Email).FirstOrDefaultAsync(ct);
            return [(userId, email)];
        }

        if (subscription.OrganizationId is int organizationId)
        {
            var ownerId = await db.Organizations
                .Where(o => o.OrganizationId == organizationId)
                .Select(o => o.OwnerId)
                .FirstOrDefaultAsync(ct);
            if (ownerId is int owner)
            {
                var email = await db.Users.Where(u => u.UserId == owner).Select(u => u.Email).FirstOrDefaultAsync(ct);
                return [(owner, email)];
            }
        }

        return [];
    }
}

public sealed class SubscriptionLifecycleOptions
{
    public const string SectionName = "SubscriptionLifecycle";

    /// <summary>Turned off in tests so a sweep never races the assertions.</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>How often to look at the clock. Hourly is plenty for a daily-granularity notice.</summary>
    public int IntervalMinutes { get; set; } = 60;

    /// <summary>How many days ahead the warning goes out.</summary>
    public int WarnDaysBefore { get; set; } = 7;

    public int StartupDelaySeconds { get; set; } = 20;
}
