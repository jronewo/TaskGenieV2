using Moq;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Common.Services;
using TaskGenie.Application.Features.Organizations.Commands;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Tests.Application;

public sealed class OrganizationMembershipTests
{
    private static OrganizationMember CreateMember(int id, int orgId, int userId, string role)
    {
        var member = OrganizationMember.Create(orgId, userId, role);
        typeof(OrganizationMember).GetProperty(nameof(OrganizationMember.OrganizationMemberId))!.SetValue(member, id);
        return member;
    }

    [Fact]
    public async Task RemoveOrganizationMember_LastOwner_ThrowsInvalidOperationException()
    {
        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.IsPlatformAdmin).Returns(false);
        currentUser.SetupGet(u => u.UserId).Returns(1);

        var owner = CreateMember(1, 10, 1, OrganizationRole.Owner);

        var memberRepo = new Mock<IOrganizationMemberRepository>();
        memberRepo.Setup(r => r.GetMembershipAsync(10, 1, It.IsAny<CancellationToken>())).ReturnsAsync(owner);
        memberRepo.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(owner);
        memberRepo.Setup(r => r.GetByOrganizationIdAsync(10, It.IsAny<CancellationToken>())).ReturnsAsync(new List<OrganizationMember> { owner });

        var handler = new RemoveOrganizationMemberCommandHandler(currentUser.Object, memberRepo.Object);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => handler.Handle(new RemoveOrganizationMemberCommand(10, 1), CancellationToken.None));

        memberRepo.Verify(r => r.DeleteAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RemoveOrganizationMember_NotOwnerOrAdmin_ThrowsForbidden()
    {
        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.IsPlatformAdmin).Returns(false);
        currentUser.SetupGet(u => u.UserId).Returns(2);

        var plainMember = CreateMember(2, 10, 2, OrganizationRole.Member);

        var memberRepo = new Mock<IOrganizationMemberRepository>();
        memberRepo.Setup(r => r.GetMembershipAsync(10, 2, It.IsAny<CancellationToken>())).ReturnsAsync(plainMember);

        var handler = new RemoveOrganizationMemberCommandHandler(currentUser.Object, memberRepo.Object);

        await Assert.ThrowsAsync<ForbiddenException>(
            () => handler.Handle(new RemoveOrganizationMemberCommand(10, 5), CancellationToken.None));
    }

    [Fact]
    public async Task RemoveOrganizationMember_SecondOwnerExists_Succeeds()
    {
        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.IsPlatformAdmin).Returns(false);
        currentUser.SetupGet(u => u.UserId).Returns(1);

        var owner1 = CreateMember(1, 10, 1, OrganizationRole.Owner);
        var owner2 = CreateMember(2, 10, 2, OrganizationRole.Owner);

        var memberRepo = new Mock<IOrganizationMemberRepository>();
        memberRepo.Setup(r => r.GetMembershipAsync(10, 1, It.IsAny<CancellationToken>())).ReturnsAsync(owner1);
        memberRepo.Setup(r => r.GetByIdAsync(2, It.IsAny<CancellationToken>())).ReturnsAsync(owner2);
        memberRepo.Setup(r => r.GetByOrganizationIdAsync(10, It.IsAny<CancellationToken>())).ReturnsAsync(new List<OrganizationMember> { owner1, owner2 });

        var handler = new RemoveOrganizationMemberCommandHandler(currentUser.Object, memberRepo.Object);

        var result = await handler.Handle(new RemoveOrganizationMemberCommand(10, 2), CancellationToken.None);

        Assert.True(result);
        memberRepo.Verify(r => r.DeleteAsync(2, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task AssignOrganizationProjectMember_UserNotInOrganization_ThrowsInvalidOperationException()
    {
        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.IsPlatformAdmin).Returns(false);
        currentUser.SetupGet(u => u.UserId).Returns(1);

        var owner = CreateMember(1, 10, 1, OrganizationRole.Owner);

        var orgMemberRepo = new Mock<IOrganizationMemberRepository>();
        orgMemberRepo.Setup(r => r.GetMembershipAsync(10, 1, It.IsAny<CancellationToken>())).ReturnsAsync(owner);
        orgMemberRepo.Setup(r => r.GetMembershipAsync(10, 99, It.IsAny<CancellationToken>())).ReturnsAsync((OrganizationMember?)null);

        var project = Project.Create("P", null, 1, 10);
        project.ProjectId = 200;
        project.SetTeamId(500);

        var projectRepo = new Mock<IProjectRepository>();
        projectRepo.Setup(r => r.GetByIdAsync(200, It.IsAny<CancellationToken>())).ReturnsAsync(project);

        var teamMemberRepo = new Mock<ITeamMemberRepository>();

        var handler = new AssignOrganizationProjectMemberCommandHandler(
            currentUser.Object, orgMemberRepo.Object, projectRepo.Object, teamMemberRepo.Object);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => handler.Handle(new AssignOrganizationProjectMemberCommand(10, 200, 99, "LEADER"), CancellationToken.None));

        teamMemberRepo.Verify(r => r.AddAsync(It.IsAny<TeamMember>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task AssignOrganizationProjectMember_ProjectBelongsToDifferentOrganization_ThrowsForbidden()
    {
        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.IsPlatformAdmin).Returns(false);
        currentUser.SetupGet(u => u.UserId).Returns(1);

        var owner = CreateMember(1, 10, 1, OrganizationRole.Owner);

        var orgMemberRepo = new Mock<IOrganizationMemberRepository>();
        orgMemberRepo.Setup(r => r.GetMembershipAsync(10, 1, It.IsAny<CancellationToken>())).ReturnsAsync(owner);

        var project = Project.Create("P", null, 1, 999); // different org
        project.ProjectId = 201;
        project.SetTeamId(501);

        var projectRepo = new Mock<IProjectRepository>();
        projectRepo.Setup(r => r.GetByIdAsync(201, It.IsAny<CancellationToken>())).ReturnsAsync(project);

        var teamMemberRepo = new Mock<ITeamMemberRepository>();

        var handler = new AssignOrganizationProjectMemberCommandHandler(
            currentUser.Object, orgMemberRepo.Object, projectRepo.Object, teamMemberRepo.Object);

        await Assert.ThrowsAsync<ForbiddenException>(
            () => handler.Handle(new AssignOrganizationProjectMemberCommand(10, 201, 2, "MEMBER"), CancellationToken.None));
    }

    [Fact]
    public async Task AssignOrganizationProjectMember_ValidMember_PromotesToLeader()
    {
        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.IsPlatformAdmin).Returns(false);
        currentUser.SetupGet(u => u.UserId).Returns(1);

        var owner = CreateMember(1, 10, 1, OrganizationRole.Owner);
        var targetMembership = CreateMember(3, 10, 2, OrganizationRole.Member);

        var orgMemberRepo = new Mock<IOrganizationMemberRepository>();
        orgMemberRepo.Setup(r => r.GetMembershipAsync(10, 1, It.IsAny<CancellationToken>())).ReturnsAsync(owner);
        orgMemberRepo.Setup(r => r.GetMembershipAsync(10, 2, It.IsAny<CancellationToken>())).ReturnsAsync(targetMembership);

        var project = Project.Create("P", null, 1, 10);
        project.ProjectId = 202;
        project.SetTeamId(502);

        var projectRepo = new Mock<IProjectRepository>();
        projectRepo.Setup(r => r.GetByIdAsync(202, It.IsAny<CancellationToken>())).ReturnsAsync(project);

        var teamMemberRepo = new Mock<ITeamMemberRepository>();
        teamMemberRepo.Setup(r => r.GetByTeamIdAsync(502, It.IsAny<CancellationToken>())).ReturnsAsync(new List<TeamMember>());

        TeamMember? added = null;
        teamMemberRepo
            .Setup(r => r.AddAsync(It.IsAny<TeamMember>(), It.IsAny<CancellationToken>()))
            .Callback<TeamMember, CancellationToken>((m, _) => added = m)
            .Returns(Task.CompletedTask);

        var handler = new AssignOrganizationProjectMemberCommandHandler(
            currentUser.Object, orgMemberRepo.Object, projectRepo.Object, teamMemberRepo.Object);

        var result = await handler.Handle(new AssignOrganizationProjectMemberCommand(10, 202, 2, "LEADER"), CancellationToken.None);

        Assert.True(result);
        Assert.NotNull(added);
        Assert.Equal("LEADER", added!.Role);
        Assert.Equal(2, added.UserId);
    }

    [Fact]
    public async Task IsOrganizationMemberPremiumAsync_ActivePaidOrgSubscription_ReturnsTrue()
    {
        var member = CreateMember(1, 10, 2, OrganizationRole.Member);
        var memberRepo = new Mock<IOrganizationMemberRepository>();
        memberRepo.Setup(r => r.GetMembershipAsync(10, 2, It.IsAny<CancellationToken>())).ReturnsAsync(member);

        var proPlan = Plan.Create("PRO_ORGANIZATION", "Org Pro", "Organization", 4999, 30, null);
        var subscription = Subscription.CreatePendingForOrganization(10, 0);
        subscription.Activate(proPlan.BillingPeriodDays);
        typeof(Subscription).GetProperty(nameof(Subscription.Plan))!.SetValue(subscription, proPlan);

        var subscriptionRepo = new Mock<ISubscriptionRepository>();
        subscriptionRepo.Setup(r => r.GetLatestForOrganizationAsync(10, It.IsAny<CancellationToken>())).ReturnsAsync(subscription);

        var planRepo = new Mock<IPlanRepository>();
        var projectRepo = new Mock<IProjectRepository>();

        var service = new SubscriptionEntitlementService(subscriptionRepo.Object, planRepo.Object, projectRepo.Object, memberRepo.Object);

        var isPremium = await service.IsOrganizationMemberPremiumAsync(10, 2, CancellationToken.None);

        Assert.True(isPremium);
    }

    [Fact]
    public async Task IsOrganizationMemberPremiumAsync_ExpiredSubscription_ReturnsFalse()
    {
        var member = CreateMember(1, 10, 2, OrganizationRole.Member);
        var memberRepo = new Mock<IOrganizationMemberRepository>();
        memberRepo.Setup(r => r.GetMembershipAsync(10, 2, It.IsAny<CancellationToken>())).ReturnsAsync(member);

        var proPlan = Plan.Create("PRO_ORGANIZATION", "Org Pro", "Organization", 4999, 30, null);
        var subscription = Subscription.CreatePendingForOrganization(10, 0);
        subscription.Activate(-5); // period already ended 5 days ago
        typeof(Subscription).GetProperty(nameof(Subscription.Plan))!.SetValue(subscription, proPlan);

        var subscriptionRepo = new Mock<ISubscriptionRepository>();
        subscriptionRepo.Setup(r => r.GetLatestForOrganizationAsync(10, It.IsAny<CancellationToken>())).ReturnsAsync(subscription);

        var planRepo = new Mock<IPlanRepository>();
        var projectRepo = new Mock<IProjectRepository>();

        var service = new SubscriptionEntitlementService(subscriptionRepo.Object, planRepo.Object, projectRepo.Object, memberRepo.Object);

        var isPremium = await service.IsOrganizationMemberPremiumAsync(10, 2, CancellationToken.None);

        Assert.False(isPremium);
    }

    [Fact]
    public async Task IsOrganizationMemberPremiumAsync_FreeOrgSubscription_ReturnsFalse()
    {
        var member = CreateMember(1, 10, 2, OrganizationRole.Member);
        var memberRepo = new Mock<IOrganizationMemberRepository>();
        memberRepo.Setup(r => r.GetMembershipAsync(10, 2, It.IsAny<CancellationToken>())).ReturnsAsync(member);

        var freePlan = Plan.Create("FREE_ORGANIZATION", "Org Free", "Organization", 0, 36500, 2);
        var subscription = Subscription.CreatePendingForOrganization(10, 0);
        subscription.Activate(freePlan.BillingPeriodDays);
        typeof(Subscription).GetProperty(nameof(Subscription.Plan))!.SetValue(subscription, freePlan);

        var subscriptionRepo = new Mock<ISubscriptionRepository>();
        subscriptionRepo.Setup(r => r.GetLatestForOrganizationAsync(10, It.IsAny<CancellationToken>())).ReturnsAsync(subscription);

        var planRepo = new Mock<IPlanRepository>();
        var projectRepo = new Mock<IProjectRepository>();

        var service = new SubscriptionEntitlementService(subscriptionRepo.Object, planRepo.Object, projectRepo.Object, memberRepo.Object);

        var isPremium = await service.IsOrganizationMemberPremiumAsync(10, 2, CancellationToken.None);

        Assert.False(isPremium);
    }

    [Fact]
    public async Task IsOrganizationMemberPremiumAsync_UserNotAMember_ReturnsFalse()
    {
        var memberRepo = new Mock<IOrganizationMemberRepository>();
        memberRepo.Setup(r => r.GetMembershipAsync(10, 42, It.IsAny<CancellationToken>())).ReturnsAsync((OrganizationMember?)null);

        var subscriptionRepo = new Mock<ISubscriptionRepository>();
        var planRepo = new Mock<IPlanRepository>();
        var projectRepo = new Mock<IProjectRepository>();

        var service = new SubscriptionEntitlementService(subscriptionRepo.Object, planRepo.Object, projectRepo.Object, memberRepo.Object);

        var isPremium = await service.IsOrganizationMemberPremiumAsync(10, 42, CancellationToken.None);

        Assert.False(isPremium);
        subscriptionRepo.Verify(r => r.GetLatestForOrganizationAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
