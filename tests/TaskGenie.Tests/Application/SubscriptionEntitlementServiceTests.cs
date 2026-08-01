using Moq;
using TaskGenie.Application.Common.Services;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Tests.Application;

public sealed class SubscriptionEntitlementServiceTests
{
    private static Plan CreatePlan(int id, string code, string scope, int? projectLimit)
    {
        var plan = Plan.Create(code, code, scope, projectLimit is null ? 999 : 0, 30, projectLimit);
        typeof(Plan).GetProperty(nameof(Plan.PlanId))!.SetValue(plan, id);
        return plan;
    }

    private static Project CreateProject(int? organizationId)
    {
        var project = Project.Create("P", null, 1, organizationId);
        return project;
    }

    [Fact]
    public async Task GetPersonalEntitlementAsync_NoSubscription_FallsBackToFreePlanLimit()
    {
        var subscriptionRepo = new Mock<ISubscriptionRepository>();
        subscriptionRepo.Setup(r => r.GetLatestForUserAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync((Subscription?)null);

        var freePlan = CreatePlan(1, "FREE_PERSONAL", "Personal", 2);
        var planRepo = new Mock<IPlanRepository>();
        planRepo.Setup(r => r.GetByCodeAsync("FREE_PERSONAL", It.IsAny<CancellationToken>())).ReturnsAsync(freePlan);

        var projectRepo = new Mock<IProjectRepository>();
        projectRepo.Setup(r => r.GetProjectsByUserIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Project> { CreateProject(null), CreateProject(null) });

        var service = new SubscriptionEntitlementService(subscriptionRepo.Object, planRepo.Object, projectRepo.Object, new Mock<IOrganizationMemberRepository>().Object);

        var entitlement = await service.GetPersonalEntitlementAsync(1, CancellationToken.None);

        Assert.Equal(2, entitlement.ProjectLimit);
        Assert.Equal(2, entitlement.CurrentProjectCount);
        Assert.False(entitlement.CanCreateProject);
        Assert.Equal("None", entitlement.SubscriptionStatus);
    }

    [Fact]
    public async Task EnsureCanCreatePersonalProjectAsync_QuotaExceeded_ThrowsInvalidOperationException()
    {
        var subscriptionRepo = new Mock<ISubscriptionRepository>();
        subscriptionRepo.Setup(r => r.GetLatestForUserAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync((Subscription?)null);

        var planRepo = new Mock<IPlanRepository>();
        planRepo.Setup(r => r.GetByCodeAsync("FREE_PERSONAL", It.IsAny<CancellationToken>())).ReturnsAsync((Plan?)null);

        var projectRepo = new Mock<IProjectRepository>();
        projectRepo.Setup(r => r.GetProjectsByUserIdAsync(5, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Project> { CreateProject(null), CreateProject(null) });

        var service = new SubscriptionEntitlementService(subscriptionRepo.Object, planRepo.Object, projectRepo.Object, new Mock<IOrganizationMemberRepository>().Object);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.EnsureCanCreatePersonalProjectAsync(5, CancellationToken.None));
    }

    [Fact]
    public async Task EnsureCanCreatePersonalProjectAsync_ActiveUnlimitedPlan_DoesNotThrow()
    {
        var proPlan = CreatePlan(2, "PRO_PERSONAL", "Personal", null);
        var subscription = Subscription.CreatePendingForUser(9, proPlan.PlanId);
        subscription.Activate(proPlan.BillingPeriodDays);
        typeof(Subscription).GetProperty(nameof(Subscription.Plan))!.SetValue(subscription, proPlan);

        var subscriptionRepo = new Mock<ISubscriptionRepository>();
        subscriptionRepo.Setup(r => r.GetLatestForUserAsync(9, It.IsAny<CancellationToken>())).ReturnsAsync(subscription);

        var planRepo = new Mock<IPlanRepository>();
        var projectRepo = new Mock<IProjectRepository>();
        projectRepo.Setup(r => r.GetProjectsByUserIdAsync(9, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Enumerable.Range(0, 10).Select(_ => CreateProject(null)).ToList());

        var service = new SubscriptionEntitlementService(subscriptionRepo.Object, planRepo.Object, projectRepo.Object, new Mock<IOrganizationMemberRepository>().Object);

        await service.EnsureCanCreatePersonalProjectAsync(9, CancellationToken.None);
    }

    [Fact]
    public async Task GetOrganizationEntitlementAsync_CountsOnlyOrganizationProjects()
    {
        var subscriptionRepo = new Mock<ISubscriptionRepository>();
        subscriptionRepo.Setup(r => r.GetLatestForOrganizationAsync(3, It.IsAny<CancellationToken>())).ReturnsAsync((Subscription?)null);

        var freeOrgPlan = CreatePlan(3, "FREE_ORGANIZATION", "Organization", 2);
        var planRepo = new Mock<IPlanRepository>();
        planRepo.Setup(r => r.GetByCodeAsync("FREE_ORGANIZATION", It.IsAny<CancellationToken>())).ReturnsAsync(freeOrgPlan);

        var projectRepo = new Mock<IProjectRepository>();
        projectRepo.Setup(r => r.GetProjectsByOrgIdAsync(3, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Project> { CreateProject(3) });

        var service = new SubscriptionEntitlementService(subscriptionRepo.Object, planRepo.Object, projectRepo.Object, new Mock<IOrganizationMemberRepository>().Object);

        var entitlement = await service.GetOrganizationEntitlementAsync(3, CancellationToken.None);

        Assert.Equal(1, entitlement.CurrentProjectCount);
        Assert.Equal(1, entitlement.RemainingProjects);
        Assert.True(entitlement.CanCreateProject);
    }
}
