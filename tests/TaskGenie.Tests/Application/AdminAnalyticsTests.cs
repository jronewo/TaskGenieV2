using Moq;
using TaskGenie.Application.Features.Admin;
using TaskGenie.Application.Features.Admin.Queries;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Tests.Application;

public sealed class AdminAnalyticsTests
{
    private static Subscription BuildSubscription(int subscriberUserId, int? organizationId, Plan plan, string status, DateTime createdAt)
    {
        var subscription = organizationId is int orgId
            ? Subscription.CreatePendingForOrganization(orgId, plan.PlanId)
            : Subscription.CreatePendingForUser(subscriberUserId, plan.PlanId);

        typeof(Subscription).GetProperty(nameof(Subscription.Plan))!.SetValue(subscription, plan);
        typeof(Subscription).GetProperty(nameof(Subscription.Status))!.SetValue(subscription, status);
        typeof(Subscription).GetProperty(nameof(Subscription.CreatedAt))!.SetValue(subscription, createdAt);
        if (status == SubscriptionStatus.Active)
            typeof(Subscription).GetProperty(nameof(Subscription.CurrentPeriodEnd))!.SetValue(subscription, DateTime.UtcNow.AddDays(30));

        return subscription;
    }

    [Fact]
    public async Task GetSubscriptionAnalytics_GroupsByYearMonthScopeAndPlan()
    {
        var personalPlan = Plan.Create("PRO_PERSONAL", "Pro", "Personal", 999, 30, null);
        var orgPlan = Plan.Create("PRO_ORGANIZATION", "Org Pro", "Organization", 4999, 30, null);

        var now = new DateTime(2026, 6, 15, 0, 0, 0, DateTimeKind.Utc);
        var subscriptions = new List<Subscription>
        {
            BuildSubscription(1, null, personalPlan, SubscriptionStatus.Active, now),
            BuildSubscription(2, null, personalPlan, SubscriptionStatus.Active, now.AddDays(2)),
            BuildSubscription(0, 10, orgPlan, SubscriptionStatus.Active, now),
            BuildSubscription(0, 11, orgPlan, SubscriptionStatus.Active, now.AddMonths(-2)), // outside 1-month window below
        };

        var subscriptionRepo = new Mock<ISubscriptionRepository>();
        subscriptionRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(subscriptions);

        var handler = new GetSubscriptionAnalyticsQueryHandler(subscriptionRepo.Object);

        // NB: cutoff is computed from DateTime.UtcNow at call time, not from `now` above, so use
        // a wide window to keep this deterministic without freezing the clock.
        var result = await handler.Handle(new GetSubscriptionAnalyticsQuery(MonthsBack: 240), CancellationToken.None);

        var personalBucket = result.Single(p => p.PlanCode == "PRO_PERSONAL" && p.Year == 2026 && p.Month == 6);
        Assert.Equal("Personal", personalBucket.Scope);
        Assert.Equal(2, personalBucket.Count);

        var orgBucketJune = result.Single(p => p.PlanCode == "PRO_ORGANIZATION" && p.Year == 2026 && p.Month == 6);
        Assert.Equal("Organization", orgBucketJune.Scope);
        Assert.Equal(1, orgBucketJune.Count);

        var orgBucketApril = result.Single(p => p.PlanCode == "PRO_ORGANIZATION" && p.Year == 2026 && p.Month == 4);
        Assert.Equal(1, orgBucketApril.Count);
    }

    [Fact]
    public async Task GetPlatformStats_ComputesActiveUsersActiveSubscriptionsAndRevenue()
    {
        var user1 = User.Create("Active", "a@test.com", "hashed");
        var user2 = User.Create("Inactive", "b@test.com", "hashed");
        typeof(User).GetProperty(nameof(User.Status))!.SetValue(user2, UserStatus.Inactive);

        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new List<User> { user1, user2 });

        var orgRepo = new Mock<IOrganizationRepository>();
        orgRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new List<Organization>());

        var projectRepo = new Mock<IProjectRepository>();
        projectRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new List<Project>());

        var taskStatsRepo = new Mock<ITaskStatsRepository>();
        taskStatsRepo.Setup(r => r.GetTotalAndDoneCountAsync(It.IsAny<CancellationToken>())).ReturnsAsync((10, 4));

        var plan = Plan.Create("PRO_PERSONAL", "Pro", "Personal", 999, 30, null);
        var activeSub = BuildSubscription(1, null, plan, SubscriptionStatus.Active, DateTime.UtcNow);
        var canceledSub = BuildSubscription(2, null, plan, SubscriptionStatus.Canceled, DateTime.UtcNow);

        var subscriptionRepo = new Mock<ISubscriptionRepository>();
        subscriptionRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new List<Subscription> { activeSub, canceledSub });

        var succeeded = PaymentTransaction.CreatePending(activeSub.SubscriptionId, 999, "USD", "SIM-1");
        succeeded.MarkSucceeded();
        var pending = PaymentTransaction.CreatePending(canceledSub.SubscriptionId, 999, "USD", "SIM-2");

        var paymentRepo = new Mock<IPaymentTransactionRepository>();
        paymentRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new List<PaymentTransaction> { succeeded, pending });

        var handler = new GetPlatformStatsQueryHandler(
            userRepo.Object, orgRepo.Object, projectRepo.Object, taskStatsRepo.Object, subscriptionRepo.Object, paymentRepo.Object);

        var stats = await handler.Handle(new GetPlatformStatsQuery(), CancellationToken.None);

        Assert.Equal(2, stats.Users);
        Assert.Equal(1, stats.ActiveUsers);
        Assert.Equal(1, stats.ActiveSubscriptions);
        Assert.Equal(999, stats.RevenueCents);
        Assert.Equal(10, stats.Tasks);
        Assert.Equal(4, stats.TasksDone);
    }
}
