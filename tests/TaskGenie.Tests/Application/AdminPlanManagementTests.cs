using Moq;
using TaskGenie.Application.Features.Admin.Commands;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Tests.Application;

public sealed class AdminPlanManagementTests
{
    [Fact]
    public async Task CreatePlan_DuplicateCode_ThrowsInvalidOperationException()
    {
        var existing = Plan.Create("PRO_PERSONAL", "Pro", "Personal", 999, 30, null);

        var planRepo = new Mock<IPlanRepository>();
        planRepo.Setup(r => r.GetByCodeAsync("PRO_PERSONAL", It.IsAny<CancellationToken>())).ReturnsAsync(existing);

        var handler = new CreatePlanCommandHandler(planRepo.Object);

        await Assert.ThrowsAsync<InvalidOperationException>(() => handler.Handle(
            new CreatePlanCommand("PRO_PERSONAL", "Pro v2", "Personal", 1999, 30, null, null, true),
            CancellationToken.None));

        planRepo.Verify(r => r.AddAsync(It.IsAny<Plan>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreatePlan_InvalidScope_ThrowsInvalidOperationException()
    {
        var planRepo = new Mock<IPlanRepository>();
        var handler = new CreatePlanCommandHandler(planRepo.Object);

        await Assert.ThrowsAsync<InvalidOperationException>(() => handler.Handle(
            new CreatePlanCommand("NEW_PLAN", "New", "Team", 999, 30, null, null, true),
            CancellationToken.None));
    }

    [Fact]
    public async Task CreatePlan_NegativePrice_ThrowsInvalidOperationException()
    {
        var planRepo = new Mock<IPlanRepository>();
        var handler = new CreatePlanCommandHandler(planRepo.Object);

        await Assert.ThrowsAsync<InvalidOperationException>(() => handler.Handle(
            new CreatePlanCommand("NEW_PLAN", "New", "Personal", -100, 30, null, null, true),
            CancellationToken.None));
    }

    [Fact]
    public async Task CreatePlan_ValidRequest_PersistsUppercasedCode()
    {
        var planRepo = new Mock<IPlanRepository>();
        planRepo.Setup(r => r.GetByCodeAsync("NEW_PLAN", It.IsAny<CancellationToken>())).ReturnsAsync((Plan?)null);

        Plan? added = null;
        planRepo.Setup(r => r.AddAsync(It.IsAny<Plan>(), It.IsAny<CancellationToken>()))
            .Callback<Plan, CancellationToken>((p, _) => added = p)
            .Returns(Task.CompletedTask);

        var handler = new CreatePlanCommandHandler(planRepo.Object);

        var result = await handler.Handle(
            new CreatePlanCommand("new_plan", "New", "Personal", 1999, 30, 10, "feature-a", true),
            CancellationToken.None);

        Assert.Equal("NEW_PLAN", result.Code);
        Assert.NotNull(added);
        Assert.Equal(10, added!.ProjectLimit);
    }

    [Fact]
    public async Task SetPlanActive_Deactivate_DoesNotDeletePlan()
    {
        var plan = Plan.Create("FREE_PERSONAL", "Free", "Personal", 0, 36500, 2);
        typeof(Plan).GetProperty(nameof(Plan.PlanId))!.SetValue(plan, 1);

        var planRepo = new Mock<IPlanRepository>();
        planRepo.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(plan);

        var handler = new SetPlanActiveCommandHandler(planRepo.Object);

        var result = await handler.Handle(new SetPlanActiveCommand(1, false), CancellationToken.None);

        Assert.False(result.IsActive);
        planRepo.Verify(r => r.UpdateAsync(It.IsAny<Plan>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpdatePlan_ReplacesEditableFields()
    {
        var plan = Plan.Create("PRO_PERSONAL", "Pro", "Personal", 999, 30, null);
        typeof(Plan).GetProperty(nameof(Plan.PlanId))!.SetValue(plan, 2);

        var planRepo = new Mock<IPlanRepository>();
        planRepo.Setup(r => r.GetByIdAsync(2, It.IsAny<CancellationToken>())).ReturnsAsync(plan);

        var handler = new UpdatePlanCommandHandler(planRepo.Object);

        var result = await handler.Handle(new UpdatePlanCommand(2, "Pro Plus", 2999, 30, 50, "feature-b"), CancellationToken.None);

        Assert.Equal("Pro Plus", result.Name);
        Assert.Equal(2999, result.PriceCents);
        Assert.Equal(50, result.ProjectLimit);
    }
}
