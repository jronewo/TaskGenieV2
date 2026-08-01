using Moq;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Projects.Commands;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Tests.Application;

public sealed class CreateProjectCommandQuotaTests
{
    private static OrganizationMember Membership(int orgId, int userId, string role)
        => OrganizationMember.Create(orgId, userId, role);

    [Fact]
    public async Task Handle_PersonalQuotaExceeded_ThrowsAndNeverCreatesProject()
    {
        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.UserId).Returns(11);
        currentUser.SetupGet(u => u.IsPlatformAdmin).Returns(false);

        var entitlementService = new Mock<ISubscriptionEntitlementService>();
        entitlementService
            .Setup(s => s.EnsureCanCreatePersonalProjectAsync(11, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Personal project quota reached (2/2) on the Free plan."));

        var lifecycle = new Mock<IProjectLifecycleService>();
        var projectRepo = new Mock<IProjectRepository>();
        var organizationRepo = new Mock<IOrganizationRepository>();
        var organizationMemberRepo = new Mock<IOrganizationMemberRepository>();

        var handler = new CreateProjectCommandHandler(
            currentUser.Object, projectRepo.Object, lifecycle.Object, organizationRepo.Object, organizationMemberRepo.Object, entitlementService.Object);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => handler.Handle(new CreateProjectCommand("New Project", null, null, null), CancellationToken.None));

        lifecycle.Verify(
            l => l.CreateProjectWithDedicatedTeamAsync(
                It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<int>(), It.IsAny<int?>(), It.IsAny<DateOnly?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Handle_PlatformAdmin_BypassesQuotaCheck()
    {
        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.UserId).Returns(1);
        currentUser.SetupGet(u => u.IsPlatformAdmin).Returns(true);

        var entitlementService = new Mock<ISubscriptionEntitlementService>();

        var project = Project.Create("New Project", null, 1);
        project.ProjectId = 100;

        var lifecycle = new Mock<IProjectLifecycleService>();
        lifecycle
            .Setup(l => l.CreateProjectWithDedicatedTeamAsync("New Project", null, 1, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(project);

        var projectRepo = new Mock<IProjectRepository>();
        projectRepo.Setup(r => r.GetByIdAsync(100, It.IsAny<CancellationToken>())).ReturnsAsync(project);

        var organizationRepo = new Mock<IOrganizationRepository>();
        var organizationMemberRepo = new Mock<IOrganizationMemberRepository>();

        var handler = new CreateProjectCommandHandler(
            currentUser.Object, projectRepo.Object, lifecycle.Object, organizationRepo.Object, organizationMemberRepo.Object, entitlementService.Object);

        var result = await handler.Handle(new CreateProjectCommand("New Project", null, null, null), CancellationToken.None);

        Assert.Equal(100, result.ProjectId);
        entitlementService.Verify(
            s => s.EnsureCanCreatePersonalProjectAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_OrganizationQuotaExceeded_ThrowsAndNeverCreatesProject()
    {
        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.UserId).Returns(7);
        currentUser.SetupGet(u => u.IsPlatformAdmin).Returns(false);

        var organization = Organization.Create("Acme", null, 7);
        typeof(Organization).GetProperty(nameof(Organization.OrganizationId))!.SetValue(organization, 55);

        var organizationRepo = new Mock<IOrganizationRepository>();
        organizationRepo.Setup(r => r.GetByIdAsync(55, It.IsAny<CancellationToken>())).ReturnsAsync(organization);

        var organizationMemberRepo = new Mock<IOrganizationMemberRepository>();
        organizationMemberRepo
            .Setup(r => r.GetMembershipAsync(55, 7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Membership(55, 7, OrganizationRole.Owner));

        var entitlementService = new Mock<ISubscriptionEntitlementService>();
        entitlementService
            .Setup(s => s.EnsureCanCreateOrganizationProjectAsync(55, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Organization project quota reached (2/2) on the Free plan."));

        var lifecycle = new Mock<IProjectLifecycleService>();
        var projectRepo = new Mock<IProjectRepository>();

        var handler = new CreateProjectCommandHandler(
            currentUser.Object, projectRepo.Object, lifecycle.Object, organizationRepo.Object, organizationMemberRepo.Object, entitlementService.Object);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => handler.Handle(new CreateProjectCommand("New Project", null, 55, null), CancellationToken.None));

        lifecycle.Verify(
            l => l.CreateProjectWithDedicatedTeamAsync(
                It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<int>(), It.IsAny<int?>(), It.IsAny<DateOnly?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    private static (Mock<ICurrentUser> currentUser, Mock<IOrganizationRepository> organizationRepo,
        Mock<IOrganizationMemberRepository> organizationMemberRepo, Mock<ISubscriptionEntitlementService> entitlementService,
        Mock<IProjectLifecycleService> lifecycle, Mock<IProjectRepository> projectRepo) BuildOrgHarness(
        int userId, int organizationId, OrganizationMember? membership)
    {
        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.UserId).Returns(userId);
        currentUser.SetupGet(u => u.IsPlatformAdmin).Returns(false);

        var organization = Organization.Create("Acme", null, 1);
        typeof(Organization).GetProperty(nameof(Organization.OrganizationId))!.SetValue(organization, organizationId);

        var organizationRepo = new Mock<IOrganizationRepository>();
        organizationRepo.Setup(r => r.GetByIdAsync(organizationId, It.IsAny<CancellationToken>())).ReturnsAsync(organization);

        var organizationMemberRepo = new Mock<IOrganizationMemberRepository>();
        organizationMemberRepo
            .Setup(r => r.GetMembershipAsync(organizationId, userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(membership);

        var entitlementService = new Mock<ISubscriptionEntitlementService>();

        var project = Project.Create("New Project", null, userId, organizationId);
        project.ProjectId = 300;

        var lifecycle = new Mock<IProjectLifecycleService>();
        lifecycle
            .Setup(l => l.CreateProjectWithDedicatedTeamAsync("New Project", null, userId, organizationId, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(project);

        var projectRepo = new Mock<IProjectRepository>();
        projectRepo.Setup(r => r.GetByIdAsync(300, It.IsAny<CancellationToken>())).ReturnsAsync(project);

        return (currentUser, organizationRepo, organizationMemberRepo, entitlementService, lifecycle, projectRepo);
    }

    [Fact]
    public async Task Handle_OrganizationOwner_CanCreateProject()
    {
        var h = BuildOrgHarness(7, 55, Membership(55, 7, OrganizationRole.Owner));

        var handler = new CreateProjectCommandHandler(
            h.currentUser.Object, h.projectRepo.Object, h.lifecycle.Object, h.organizationRepo.Object, h.organizationMemberRepo.Object, h.entitlementService.Object);

        var result = await handler.Handle(new CreateProjectCommand("New Project", null, 55, null), CancellationToken.None);

        Assert.Equal(300, result.ProjectId);
    }

    [Fact]
    public async Task Handle_OrganizationAdmin_CanCreateProject()
    {
        var h = BuildOrgHarness(8, 55, Membership(55, 8, OrganizationRole.Admin));

        var handler = new CreateProjectCommandHandler(
            h.currentUser.Object, h.projectRepo.Object, h.lifecycle.Object, h.organizationRepo.Object, h.organizationMemberRepo.Object, h.entitlementService.Object);

        var result = await handler.Handle(new CreateProjectCommand("New Project", null, 55, null), CancellationToken.None);

        Assert.Equal(300, result.ProjectId);
    }

    [Fact]
    public async Task Handle_OrganizationMember_ForbiddenFromCreatingProject()
    {
        var h = BuildOrgHarness(9, 55, Membership(55, 9, OrganizationRole.Member));

        var handler = new CreateProjectCommandHandler(
            h.currentUser.Object, h.projectRepo.Object, h.lifecycle.Object, h.organizationRepo.Object, h.organizationMemberRepo.Object, h.entitlementService.Object);

        await Assert.ThrowsAsync<ForbiddenException>(
            () => handler.Handle(new CreateProjectCommand("New Project", null, 55, null), CancellationToken.None));

        h.lifecycle.Verify(
            l => l.CreateProjectWithDedicatedTeamAsync(
                It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<int>(), It.IsAny<int?>(), It.IsAny<DateOnly?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Handle_NonMemberOfOrganization_ForbiddenFromCreatingProject()
    {
        var h = BuildOrgHarness(10, 55, membership: null);

        var handler = new CreateProjectCommandHandler(
            h.currentUser.Object, h.projectRepo.Object, h.lifecycle.Object, h.organizationRepo.Object, h.organizationMemberRepo.Object, h.entitlementService.Object);

        await Assert.ThrowsAsync<ForbiddenException>(
            () => handler.Handle(new CreateProjectCommand("New Project", null, 55, null), CancellationToken.None));

        h.lifecycle.Verify(
            l => l.CreateProjectWithDedicatedTeamAsync(
                It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<int>(), It.IsAny<int?>(), It.IsAny<DateOnly?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Handle_MemberOfDifferentOrganization_ForbiddenFromCreatingProjectUnderTargetOrg()
    {
        // User 11 is OWNER of org 999, but is requesting a project under org 55 — no
        // membership row exists for (55, 11), so this must be forbidden regardless of their
        // standing elsewhere.
        var h = BuildOrgHarness(11, 55, membership: null);

        var handler = new CreateProjectCommandHandler(
            h.currentUser.Object, h.projectRepo.Object, h.lifecycle.Object, h.organizationRepo.Object, h.organizationMemberRepo.Object, h.entitlementService.Object);

        await Assert.ThrowsAsync<ForbiddenException>(
            () => handler.Handle(new CreateProjectCommand("New Project", null, 55, null), CancellationToken.None));
    }
}
