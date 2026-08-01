using Moq;
using TaskGenie.Application.Features.Admin.Commands;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Tests.Application;

public sealed class AdminUserManagementTests
{
    private static User CreateUser(int id, string role, int status = UserStatus.Active)
    {
        var user = User.Create($"User {id}", $"user{id}@test.com", "hashed", role);
        typeof(User).GetProperty(nameof(User.UserId))!.SetValue(user, id);
        typeof(User).GetProperty(nameof(User.Status))!.SetValue(user, status);
        return user;
    }

    [Fact]
    public async Task DeleteUser_LastActiveAdmin_ThrowsInvalidOperationException()
    {
        var admin = CreateUser(1, "PLATFORM_ADMIN");

        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(admin);
        userRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new List<User> { admin });

        var handler = new DeleteUserCommandHandler(userRepo.Object);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => handler.Handle(new DeleteUserCommand(1), CancellationToken.None));

        userRepo.Verify(r => r.UpdateUserAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DeleteUser_AnotherActiveAdminExists_Succeeds()
    {
        var admin1 = CreateUser(1, "PLATFORM_ADMIN");
        var admin2 = CreateUser(2, "PLATFORM_ADMIN");

        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(admin1);
        userRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new List<User> { admin1, admin2 });

        var handler = new DeleteUserCommandHandler(userRepo.Object);

        var result = await handler.Handle(new DeleteUserCommand(1), CancellationToken.None);

        Assert.True(result);
        userRepo.Verify(r => r.UpdateUserAsync(It.Is<User>(u => u.UserId == 1 && u.DeletedAt != null), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeleteUser_NormalUser_Succeeds_NoLastAdminCheckNeeded()
    {
        var normal = CreateUser(3, "NORMAL_USER");

        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByIdAsync(3, It.IsAny<CancellationToken>())).ReturnsAsync(normal);

        var handler = new DeleteUserCommandHandler(userRepo.Object);

        var result = await handler.Handle(new DeleteUserCommand(3), CancellationToken.None);

        Assert.True(result);
        userRepo.Verify(r => r.GetAllAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task UpdateUserPlatformRole_DemoteLastAdmin_ThrowsInvalidOperationException()
    {
        var admin = CreateUser(1, "PLATFORM_ADMIN");

        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(admin);
        userRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new List<User> { admin });

        var handler = new UpdateUserPlatformRoleCommandHandler(userRepo.Object);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => handler.Handle(new UpdateUserPlatformRoleCommand(1, "NORMAL_USER"), CancellationToken.None));
    }

    [Fact]
    public async Task UpdateUserStatus_DeactivateLastAdmin_ThrowsInvalidOperationException()
    {
        var admin = CreateUser(1, "PLATFORM_ADMIN");

        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(admin);
        userRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new List<User> { admin });

        var handler = new UpdateUserStatusCommandHandler(userRepo.Object);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => handler.Handle(new UpdateUserStatusCommand(1, UserStatus.Inactive), CancellationToken.None));
    }

    [Fact]
    public async Task UpdateUserStatus_Reactivating_NeverChecksLastAdmin()
    {
        var admin = CreateUser(1, "PLATFORM_ADMIN", status: UserStatus.Inactive);

        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(admin);

        var handler = new UpdateUserStatusCommandHandler(userRepo.Object);

        var result = await handler.Handle(new UpdateUserStatusCommand(1, UserStatus.Active), CancellationToken.None);

        Assert.Equal(UserStatus.Active, result.Status);
        userRepo.Verify(r => r.GetAllAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task AdminCreateUser_DuplicateEmail_ThrowsInvalidOperationException()
    {
        var existing = CreateUser(5, "NORMAL_USER");

        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByEmailAsync("dup@test.com", It.IsAny<CancellationToken>())).ReturnsAsync(existing);

        var passwordHasher = new Mock<IPasswordHasher>();

        var handler = new AdminCreateUserCommandHandler(userRepo.Object, passwordHasher.Object);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => handler.Handle(new AdminCreateUserCommand("New", "dup@test.com", "Password1", "NORMAL_USER"), CancellationToken.None));
    }

    [Fact]
    public async Task AdminCreateUser_DoesNotReturnPasswordHash()
    {
        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByEmailAsync("new@test.com", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        var passwordHasher = new Mock<IPasswordHasher>();
        passwordHasher.Setup(h => h.Hash(It.IsAny<string>())).Returns("hashed-secret");

        var handler = new AdminCreateUserCommandHandler(userRepo.Object, passwordHasher.Object);

        var result = await handler.Handle(new AdminCreateUserCommand("New", "new@test.com", "Password1", "NORMAL_USER"), CancellationToken.None);

        Assert.Equal("new@test.com", result.Email);
        Assert.DoesNotContain("hashed-secret", result.GetType().GetProperties().Select(p => p.GetValue(result)?.ToString() ?? ""));
    }
}
