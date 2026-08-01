using Moq;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Skills.Commands;
using TaskGenie.Application.Features.Skills.Queries;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Tests.Application;

public sealed class SkillManagementTests
{
    private static UserSkill CreateUserSkill(int id, int userId, int skillId, int level)
    {
        var us = UserSkill.Create(userId, skillId, level);
        typeof(UserSkill).GetProperty(nameof(UserSkill.Id))!.SetValue(us, id);
        return us;
    }

    // ---- Skill catalog CRUD lifecycle ----

    [Fact]
    public async Task CreateSkill_DuplicateName_ThrowsInvalidOperationException()
    {
        var existing = Skill.Create("C#");
        var skillRepo = new Mock<ISkillRepository>();
        skillRepo.Setup(r => r.GetByNameAsync("C#", It.IsAny<CancellationToken>())).ReturnsAsync(existing);

        var handler = new CreateSkillCommandHandler(skillRepo.Object);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => handler.Handle(new CreateSkillCommand("C#"), CancellationToken.None));

        skillRepo.Verify(r => r.AddAsync(It.IsAny<Skill>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateSkill_NewName_Succeeds()
    {
        var skillRepo = new Mock<ISkillRepository>();
        skillRepo.Setup(r => r.GetByNameAsync("Rust", It.IsAny<CancellationToken>())).ReturnsAsync((Skill?)null);

        var handler = new CreateSkillCommandHandler(skillRepo.Object);

        var result = await handler.Handle(new CreateSkillCommand("Rust"), CancellationToken.None);

        Assert.Equal("Rust", result.SkillName);
        Assert.True(result.IsActive);
        skillRepo.Verify(r => r.AddAsync(It.IsAny<Skill>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpdateSkill_NameCollidesWithAnotherSkill_ThrowsInvalidOperationException()
    {
        var target = Skill.Create("Go");
        typeof(Skill).GetProperty(nameof(Skill.SkillId))!.SetValue(target, 1);
        var other = Skill.Create("Python");
        typeof(Skill).GetProperty(nameof(Skill.SkillId))!.SetValue(other, 2);

        var skillRepo = new Mock<ISkillRepository>();
        skillRepo.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(target);
        skillRepo.Setup(r => r.GetByNameAsync("Python", It.IsAny<CancellationToken>())).ReturnsAsync(other);

        var handler = new UpdateSkillCommandHandler(skillRepo.Object);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => handler.Handle(new UpdateSkillCommand(1, "Python"), CancellationToken.None));
    }

    [Fact]
    public async Task UpdateSkill_RenamingToSameNameItAlreadyHas_Succeeds()
    {
        var target = Skill.Create("Go");
        typeof(Skill).GetProperty(nameof(Skill.SkillId))!.SetValue(target, 1);

        var skillRepo = new Mock<ISkillRepository>();
        skillRepo.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(target);
        skillRepo.Setup(r => r.GetByNameAsync("Go", It.IsAny<CancellationToken>())).ReturnsAsync(target);

        var handler = new UpdateSkillCommandHandler(skillRepo.Object);

        var result = await handler.Handle(new UpdateSkillCommand(1, "Go"), CancellationToken.None);

        Assert.Equal("Go", result.SkillName);
    }

    [Fact]
    public async Task SetSkillActive_Deactivate_NeverCallsDelete()
    {
        var skill = Skill.Create("Kotlin");
        typeof(Skill).GetProperty(nameof(Skill.SkillId))!.SetValue(skill, 5);

        var skillRepo = new Mock<ISkillRepository>();
        skillRepo.Setup(r => r.GetByIdAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(skill);

        var handler = new SetSkillActiveCommandHandler(skillRepo.Object);

        var result = await handler.Handle(new SetSkillActiveCommand(5, false), CancellationToken.None);

        Assert.False(result.IsActive);
        skillRepo.Verify(r => r.UpdateAsync(It.IsAny<Skill>(), It.IsAny<CancellationToken>()), Times.Once);
        skillRepo.Verify(r => r.DeleteAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetAllSkills_NonAdmin_HidesInactiveSkills()
    {
        var active = Skill.Create("Active Skill");
        var inactive = Skill.Create("Inactive Skill");
        inactive.Deactivate();

        var skillRepo = new Mock<ISkillRepository>();
        skillRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new List<Skill> { active, inactive });

        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.IsPlatformAdmin).Returns(false);

        var handler = new GetAllSkillsQueryHandler(skillRepo.Object, currentUser.Object);

        var result = await handler.Handle(new GetAllSkillsQuery(), CancellationToken.None);

        Assert.Single(result);
        Assert.Equal("Active Skill", result[0].SkillName);
    }

    [Fact]
    public async Task GetAllSkills_Admin_SeesInactiveSkillsToo()
    {
        var active = Skill.Create("Active Skill");
        var inactive = Skill.Create("Inactive Skill");
        inactive.Deactivate();

        var skillRepo = new Mock<ISkillRepository>();
        skillRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new List<Skill> { active, inactive });

        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.IsPlatformAdmin).Returns(true);

        var handler = new GetAllSkillsQueryHandler(skillRepo.Object, currentUser.Object);

        var result = await handler.Handle(new GetAllSkillsQuery(), CancellationToken.None);

        Assert.Equal(2, result.Count);
    }

    // ---- User-skill self-service authorization ----

    [Fact]
    public async Task AddUserSkill_AlwaysUsesCurrentUserId_IgnoringAnyClientSuppliedId()
    {
        var userSkillRepo = new Mock<IUserSkillRepository>();
        userSkillRepo.Setup(r => r.GetByUserIdAsync(7, It.IsAny<CancellationToken>())).ReturnsAsync(new List<UserSkill>());

        UserSkill? added = null;
        userSkillRepo.Setup(r => r.AddAsync(It.IsAny<UserSkill>(), It.IsAny<CancellationToken>()))
            .Callback<UserSkill, CancellationToken>((us, _) => added = us)
            .Returns(Task.CompletedTask);

        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.UserId).Returns(7);

        var handler = new AddUserSkillCommandHandler(userSkillRepo.Object, currentUser.Object);

        var result = await handler.Handle(new AddUserSkillCommand(SkillId: 3, Level: 2), CancellationToken.None);

        Assert.True(result);
        Assert.Equal(7, added!.UserId);
    }

    [Fact]
    public async Task UpdateUserSkillLevel_NotOwner_ThrowsForbidden()
    {
        var userSkill = CreateUserSkill(1, userId: 9, skillId: 3, level: 2);

        var userSkillRepo = new Mock<IUserSkillRepository>();
        userSkillRepo.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(userSkill);

        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.UserId).Returns(99);

        var handler = new UpdateUserSkillLevelCommandHandler(userSkillRepo.Object, currentUser.Object);

        await Assert.ThrowsAsync<ForbiddenException>(
            () => handler.Handle(new UpdateUserSkillLevelCommand(1, 5), CancellationToken.None));

        userSkillRepo.Verify(r => r.UpdateAsync(It.IsAny<UserSkill>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task UpdateUserSkillLevel_Owner_Succeeds()
    {
        var userSkill = CreateUserSkill(1, userId: 9, skillId: 3, level: 2);

        var userSkillRepo = new Mock<IUserSkillRepository>();
        userSkillRepo.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(userSkill);

        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.UserId).Returns(9);

        var handler = new UpdateUserSkillLevelCommandHandler(userSkillRepo.Object, currentUser.Object);

        var result = await handler.Handle(new UpdateUserSkillLevelCommand(1, 5), CancellationToken.None);

        Assert.True(result);
        Assert.Equal(5, userSkill.Level);
    }

    [Fact]
    public async Task RemoveUserSkill_NotOwner_ThrowsForbidden_EvenForPlatformAdmin()
    {
        var userSkill = CreateUserSkill(2, userId: 9, skillId: 3, level: 2);

        var userSkillRepo = new Mock<IUserSkillRepository>();
        userSkillRepo.Setup(r => r.GetByIdAsync(2, It.IsAny<CancellationToken>())).ReturnsAsync(userSkill);

        // Even a platform admin cannot mutate someone else's skills — view-only for admins.
        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.UserId).Returns(1);
        currentUser.SetupGet(u => u.IsPlatformAdmin).Returns(true);

        var handler = new RemoveUserSkillCommandHandler(userSkillRepo.Object, currentUser.Object);

        await Assert.ThrowsAsync<ForbiddenException>(
            () => handler.Handle(new RemoveUserSkillCommand(2), CancellationToken.None));

        userSkillRepo.Verify(r => r.DeleteAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetUserSkills_OwnSkills_Succeeds()
    {
        var userSkillRepo = new Mock<IUserSkillRepository>();
        userSkillRepo.Setup(r => r.GetByUserIdAsync(9, It.IsAny<CancellationToken>())).ReturnsAsync(new List<UserSkill>());

        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.UserId).Returns(9);
        currentUser.SetupGet(u => u.IsPlatformAdmin).Returns(false);

        var handler = new GetUserSkillsQueryHandler(userSkillRepo.Object, currentUser.Object);

        var result = await handler.Handle(new GetUserSkillsQuery(9), CancellationToken.None);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task GetUserSkills_OtherUser_NonAdmin_ThrowsForbidden()
    {
        var userSkillRepo = new Mock<IUserSkillRepository>();

        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.UserId).Returns(9);
        currentUser.SetupGet(u => u.IsPlatformAdmin).Returns(false);

        var handler = new GetUserSkillsQueryHandler(userSkillRepo.Object, currentUser.Object);

        await Assert.ThrowsAsync<ForbiddenException>(
            () => handler.Handle(new GetUserSkillsQuery(42), CancellationToken.None));
    }

    [Fact]
    public async Task GetUserSkills_OtherUser_PlatformAdmin_CanView()
    {
        var userSkillRepo = new Mock<IUserSkillRepository>();
        userSkillRepo.Setup(r => r.GetByUserIdAsync(42, It.IsAny<CancellationToken>())).ReturnsAsync(new List<UserSkill>());

        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.UserId).Returns(1);
        currentUser.SetupGet(u => u.IsPlatformAdmin).Returns(true);

        var handler = new GetUserSkillsQueryHandler(userSkillRepo.Object, currentUser.Object);

        var result = await handler.Handle(new GetUserSkillsQuery(42), CancellationToken.None);

        Assert.NotNull(result);
    }
}
