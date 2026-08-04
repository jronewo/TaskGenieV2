using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Infrastructure.BackgroundJobs;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Tests.Integration;

/// <summary>
/// The expiry sweep. Entitlements already ignored a lapsed subscription, so what is under test here
/// is the part that was missing entirely: the row being marked EXPIRED, and somebody being told.
/// </summary>
public sealed class SubscriptionLifecycleWorkerTests
{
    [Fact]
    public async Task Sweep_WarnsOnceWhenTheSubscriptionIsInsideTheWarningWindow()
    {
        await using var factory = new LifecycleWorkerFactory();
        var userId = await factory.SeedUserAsync();
        var subscriptionId = await factory.SeedSubscriptionAsync(userId, DateTime.UtcNow.AddDays(5));

        await factory.RunSweepAsync();
        // A second sweep must not send a second warning — the notification row is the dedupe record.
        await factory.RunSweepAsync();

        await factory.WithDbAsync(db =>
        {
            var notices = db.Notifications
                .Where(n => n.UserId == userId && n.Type == SubscriptionLifecycleWorker.ExpiringSoonType)
                .ToList();
            Assert.Single(notices);
            Assert.Contains("sắp hết hạn", notices[0].Title!);
            Assert.Equal(subscriptionId, notices[0].ReferenceId);

            // Still inside the period, so the subscription stays active.
            Assert.Equal(SubscriptionStatuses.Active, db.Subscriptions.Single(s => s.SubscriptionId == subscriptionId).Status);
        });
    }

    [Fact]
    public async Task Sweep_ExpiresALapsedSubscriptionAndSaysWhatWasLost()
    {
        await using var factory = new LifecycleWorkerFactory();
        var userId = await factory.SeedUserAsync();
        var subscriptionId = await factory.SeedSubscriptionAsync(userId, DateTime.UtcNow.AddDays(-1));

        await factory.RunSweepAsync();

        await factory.WithDbAsync(db =>
        {
            Assert.Equal(SubscriptionStatuses.Expired, db.Subscriptions.Single(s => s.SubscriptionId == subscriptionId).Status);

            var notice = db.Notifications.Single(
                n => n.UserId == userId && n.Type == SubscriptionLifecycleWorker.ExpiredType);
            // The consequence, not just the fact — someone who cannot see what they lost has no
            // reason to renew.
            Assert.Contains("2 dự án", notice.Message!);
            Assert.Contains("tổ chức", notice.Message!);
        });
    }

    [Fact]
    public async Task Sweep_LeavesASubscriptionWellInsideItsPeriodAlone()
    {
        await using var factory = new LifecycleWorkerFactory();
        var userId = await factory.SeedUserAsync();
        await factory.SeedSubscriptionAsync(userId, DateTime.UtcNow.AddDays(45));

        await factory.RunSweepAsync();

        await factory.WithDbAsync(db => Assert.Empty(db.Notifications.Where(n => n.UserId == userId)));
    }

    [Fact]
    public async Task Sweep_EmailsTheOwnerAlongsideTheInAppNotice()
    {
        await using var factory = new LifecycleWorkerFactory();
        var userId = await factory.SeedUserAsync();
        await factory.SeedSubscriptionAsync(userId, DateTime.UtcNow.AddDays(3));

        await factory.RunSweepAsync();

        Assert.Single(factory.Emails.Sent);
        Assert.Equal(3, factory.Emails.Sent[0].DaysRemaining);
    }

    /// <summary>A mail provider being down must not cost the in-app notification.</summary>
    [Fact]
    public async Task Sweep_StillRecordsTheNoticeWhenTheEmailProviderFails()
    {
        await using var factory = new LifecycleWorkerFactory();
        factory.Emails.Throw = true;
        var userId = await factory.SeedUserAsync();
        await factory.SeedSubscriptionAsync(userId, DateTime.UtcNow.AddDays(2));

        await factory.RunSweepAsync();

        await factory.WithDbAsync(db => Assert.Single(db.Notifications.Where(n => n.UserId == userId)));
    }
}

public sealed class RecordingExpiryEmailSender : IEmailSender
{
    public record SentEmail(string ToEmail, string PlanName, int DaysRemaining);

    public List<SentEmail> Sent { get; } = [];
    public bool Throw { get; set; }

    public Task SendPasswordResetEmailAsync(string toEmail, string resetToken, CancellationToken ct = default)
        => Task.CompletedTask;

    public Task SendTeamInvitationEmailAsync(
        string toEmail, string teamName, string invitedByName, string respondUrl, CancellationToken ct = default)
        => Task.CompletedTask;

    public Task SendSubscriptionExpiryEmailAsync(
        string toEmail, string planName, int daysRemaining, DateTime periodEnd, string manageUrl,
        CancellationToken ct = default)
    {
        if (Throw) throw new InvalidOperationException("SMTP unavailable.");
        Sent.Add(new SentEmail(toEmail, planName, daysRemaining));
        return Task.CompletedTask;
    }
}

public sealed class LifecycleWorkerFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = $"taskgenie-lifecycle-{Guid.NewGuid()}";

    public RecordingExpiryEmailSender Emails { get; } = new();

    public LifecycleWorkerFactory()
    {
        Environment.SetEnvironmentVariable("Jwt__Secret", "taskgenie-lifecycle-worker-test-secret-32c");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.RemoveAll<AppDbContext>();
            services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(_databaseName));

            services.RemoveAll<IEmailSender>();
            services.AddSingleton<IEmailSender>(Emails);
        });
    }

    /// <summary>
    /// Drives exactly one sweep. The worker is not registered under Testing, so it is constructed
    /// here rather than waiting on its timer — which also keeps the assertions deterministic.
    /// </summary>
    public async Task RunSweepAsync()
    {
        using var scope = Services.CreateScope();
        var worker = ActivatorUtilities.CreateInstance<SubscriptionLifecycleWorker>(scope.ServiceProvider);
        await worker.RunOnceAsync(CancellationToken.None);
    }

    public async Task<int> SeedUserAsync()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();
        var user = User.Create($"User {Guid.NewGuid():N}", $"user-{Guid.NewGuid():N}@lifecycle.test", "hash");
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user.UserId;
    }

    public async Task<int> SeedSubscriptionAsync(int userId, DateTime periodEnd)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var plan = Plan.Create(
            $"PRO_{Guid.NewGuid():N}", "Pro", "PERSONAL", "MONTHLY",
            priceMinor: 249_000, currency: "VND", projectLimit: null, memberLimit: null,
            sortOrder: 0, aiChatbotEnabled: true);
        context.Plans.Add(plan);
        await context.SaveChangesAsync();

        var subscription = Subscription.CreateForUser(plan.PlanId, userId);
        subscription.Activate(periodEnd);
        context.Subscriptions.Add(subscription);
        await context.SaveChangesAsync();
        return subscription.SubscriptionId;
    }

    public async Task WithDbAsync(Action<AppDbContext> assertion)
    {
        using var scope = Services.CreateScope();
        assertion(scope.ServiceProvider.GetRequiredService<AppDbContext>());
        await Task.CompletedTask;
    }
}
