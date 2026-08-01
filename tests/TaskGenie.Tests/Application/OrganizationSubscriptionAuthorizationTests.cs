using Moq;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Subscriptions.Commands;
using TaskGenie.Application.Features.Subscriptions.DTOs;
using TaskGenie.Application.Features.Subscriptions.Queries;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Tests.Application;

/// <summary>Organization-scoped subscription actions must key off OrganizationMember role
/// (OWNER/ADMIN), matching CreateProjectCommand's org-level authorization — not
/// Organization.OwnerId alone, which would incorrectly lock out ADMIN members.</summary>
public sealed class OrganizationSubscriptionAuthorizationTests
{
    private static OrganizationMember Membership(int orgId, int userId, string role)
        => OrganizationMember.Create(orgId, userId, role);

    private static Organization BuildOrg(int id, int ownerId)
    {
        var org = Organization.Create("Acme", null, ownerId);
        typeof(Organization).GetProperty(nameof(Organization.OrganizationId))!.SetValue(org, id);
        return org;
    }

    [Fact]
    public async Task Subscribe_OrgAdmin_NotOwner_CanSubscribeOnBehalfOfOrganization()
    {
        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.UserId).Returns(8);
        currentUser.SetupGet(u => u.IsPlatformAdmin).Returns(false);

        var org = BuildOrg(10, ownerId: 1); // owner is user 1, not the caller

        var organizationRepo = new Mock<IOrganizationRepository>();
        organizationRepo.Setup(r => r.GetByIdAsync(10, It.IsAny<CancellationToken>())).ReturnsAsync(org);

        var organizationMemberRepo = new Mock<IOrganizationMemberRepository>();
        organizationMemberRepo
            .Setup(r => r.GetMembershipAsync(10, 8, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Membership(10, 8, OrganizationRole.Admin));

        var plan = Plan.Create("PRO_ORGANIZATION", "Org Pro", "Organization", 4999, 30, null);
        typeof(Plan).GetProperty(nameof(Plan.PlanId))!.SetValue(plan, 4);

        var planRepo = new Mock<IPlanRepository>();
        planRepo.Setup(r => r.GetByIdAsync(4, It.IsAny<CancellationToken>())).ReturnsAsync(plan);

        Subscription? added = null;
        var subscriptionRepo = new Mock<ISubscriptionRepository>();
        subscriptionRepo.Setup(r => r.AddAsync(It.IsAny<Subscription>(), It.IsAny<CancellationToken>()))
            .Callback<Subscription, CancellationToken>((s, _) => added = s)
            .Returns(Task.CompletedTask);
        subscriptionRepo.Setup(r => r.GetByIdAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(() =>
            {
                typeof(Subscription).GetProperty(nameof(Subscription.Plan))!.SetValue(added, plan);
                return added;
            });

        var paymentRepo = new Mock<IPaymentTransactionRepository>();

        var handler = new SubscribeCommandHandler(
            currentUser.Object, organizationRepo.Object, organizationMemberRepo.Object, planRepo.Object, subscriptionRepo.Object, paymentRepo.Object);

        var result = await handler.Handle(new SubscribeCommand(4, 10), CancellationToken.None);

        Assert.NotNull(result);
        subscriptionRepo.Verify(r => r.AddAsync(It.IsAny<Subscription>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Subscribe_PlainMember_ForbiddenFromSubscribingOrganization()
    {
        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.UserId).Returns(9);
        currentUser.SetupGet(u => u.IsPlatformAdmin).Returns(false);

        var org = BuildOrg(10, ownerId: 1);

        var organizationRepo = new Mock<IOrganizationRepository>();
        organizationRepo.Setup(r => r.GetByIdAsync(10, It.IsAny<CancellationToken>())).ReturnsAsync(org);

        var organizationMemberRepo = new Mock<IOrganizationMemberRepository>();
        organizationMemberRepo
            .Setup(r => r.GetMembershipAsync(10, 9, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Membership(10, 9, OrganizationRole.Member));

        var plan = Plan.Create("PRO_ORGANIZATION", "Org Pro", "Organization", 4999, 30, null);
        typeof(Plan).GetProperty(nameof(Plan.PlanId))!.SetValue(plan, 4);
        var planRepo = new Mock<IPlanRepository>();
        planRepo.Setup(r => r.GetByIdAsync(4, It.IsAny<CancellationToken>())).ReturnsAsync(plan);

        var subscriptionRepo = new Mock<ISubscriptionRepository>();
        var paymentRepo = new Mock<IPaymentTransactionRepository>();

        var handler = new SubscribeCommandHandler(
            currentUser.Object, organizationRepo.Object, organizationMemberRepo.Object, planRepo.Object, subscriptionRepo.Object, paymentRepo.Object);

        await Assert.ThrowsAsync<ForbiddenException>(
            () => handler.Handle(new SubscribeCommand(4, 10), CancellationToken.None));

        subscriptionRepo.Verify(r => r.AddAsync(It.IsAny<Subscription>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CancelSubscription_OrgAdmin_CanCancel()
    {
        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.UserId).Returns(8);
        currentUser.SetupGet(u => u.IsPlatformAdmin).Returns(false);

        var org = BuildOrg(10, ownerId: 1);
        var organizationRepo = new Mock<IOrganizationRepository>();
        organizationRepo.Setup(r => r.GetByIdAsync(10, It.IsAny<CancellationToken>())).ReturnsAsync(org);

        var organizationMemberRepo = new Mock<IOrganizationMemberRepository>();
        organizationMemberRepo
            .Setup(r => r.GetMembershipAsync(10, 8, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Membership(10, 8, OrganizationRole.Admin));

        var plan = Plan.Create("PRO_ORGANIZATION", "Org Pro", "Organization", 4999, 30, null);
        var activeSub = Subscription.CreatePendingForOrganization(10, 0);
        activeSub.Activate(plan.BillingPeriodDays);
        typeof(Subscription).GetProperty(nameof(Subscription.Plan))!.SetValue(activeSub, plan);

        var entitlementService = new Mock<ISubscriptionEntitlementService>();
        entitlementService.Setup(s => s.GetActiveSubscriptionForOrganizationAsync(10, It.IsAny<CancellationToken>())).ReturnsAsync(activeSub);

        var subscriptionRepo = new Mock<ISubscriptionRepository>();

        var handler = new CancelSubscriptionCommandHandler(
            currentUser.Object, organizationRepo.Object, organizationMemberRepo.Object, entitlementService.Object, subscriptionRepo.Object);

        var result = await handler.Handle(new CancelSubscriptionCommand(10), CancellationToken.None);

        Assert.True(result);
        Assert.Equal(SubscriptionStatus.Canceled, activeSub.Status);
    }

    [Fact]
    public async Task CancelSubscription_PlainMember_Forbidden()
    {
        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.UserId).Returns(9);
        currentUser.SetupGet(u => u.IsPlatformAdmin).Returns(false);

        var org = BuildOrg(10, ownerId: 1);
        var organizationRepo = new Mock<IOrganizationRepository>();
        organizationRepo.Setup(r => r.GetByIdAsync(10, It.IsAny<CancellationToken>())).ReturnsAsync(org);

        var organizationMemberRepo = new Mock<IOrganizationMemberRepository>();
        organizationMemberRepo
            .Setup(r => r.GetMembershipAsync(10, 9, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Membership(10, 9, OrganizationRole.Member));

        var entitlementService = new Mock<ISubscriptionEntitlementService>();
        var subscriptionRepo = new Mock<ISubscriptionRepository>();

        var handler = new CancelSubscriptionCommandHandler(
            currentUser.Object, organizationRepo.Object, organizationMemberRepo.Object, entitlementService.Object, subscriptionRepo.Object);

        await Assert.ThrowsAsync<ForbiddenException>(
            () => handler.Handle(new CancelSubscriptionCommand(10), CancellationToken.None));
    }

    [Fact]
    public async Task GetMySubscription_PlainMember_CanViewOrgPlan()
    {
        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.UserId).Returns(9);
        currentUser.SetupGet(u => u.IsPlatformAdmin).Returns(false);

        var org = BuildOrg(10, ownerId: 1);
        var organizationRepo = new Mock<IOrganizationRepository>();
        organizationRepo.Setup(r => r.GetByIdAsync(10, It.IsAny<CancellationToken>())).ReturnsAsync(org);

        var organizationMemberRepo = new Mock<IOrganizationMemberRepository>();
        organizationMemberRepo
            .Setup(r => r.GetMembershipAsync(10, 9, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Membership(10, 9, OrganizationRole.Member));

        var entitlementService = new Mock<ISubscriptionEntitlementService>();
        entitlementService.Setup(s => s.GetActiveSubscriptionForOrganizationAsync(10, It.IsAny<CancellationToken>())).ReturnsAsync((Subscription?)null);
        entitlementService.Setup(s => s.GetOrganizationEntitlementAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EntitlementDto
            {
                PlanCode = "FREE_ORGANIZATION",
                PlanName = "Organization Free",
                ProjectLimit = 2,
                CurrentProjectCount = 0,
                CanCreateProject = true,
                SubscriptionStatus = "None"
            });

        var handler = new GetMySubscriptionQueryHandler(currentUser.Object, organizationRepo.Object, organizationMemberRepo.Object, entitlementService.Object);

        var result = await handler.Handle(new GetMySubscriptionQuery(10), CancellationToken.None);

        Assert.Equal("FREE_ORGANIZATION", result.Entitlement.PlanCode);
    }

    [Fact]
    public async Task GetPaymentHistory_PlainMember_Forbidden_OnlyOwnerAdminCanView()
    {
        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.UserId).Returns(9);
        currentUser.SetupGet(u => u.IsPlatformAdmin).Returns(false);

        var org = BuildOrg(10, ownerId: 1);
        var organizationRepo = new Mock<IOrganizationRepository>();
        organizationRepo.Setup(r => r.GetByIdAsync(10, It.IsAny<CancellationToken>())).ReturnsAsync(org);

        var organizationMemberRepo = new Mock<IOrganizationMemberRepository>();
        organizationMemberRepo
            .Setup(r => r.GetMembershipAsync(10, 9, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Membership(10, 9, OrganizationRole.Member));

        var paymentRepo = new Mock<IPaymentTransactionRepository>();

        var handler = new GetPaymentHistoryQueryHandler(currentUser.Object, organizationRepo.Object, organizationMemberRepo.Object, paymentRepo.Object);

        await Assert.ThrowsAsync<ForbiddenException>(
            () => handler.Handle(new GetPaymentHistoryQuery(10), CancellationToken.None));
    }
}
