using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using TaskGenie.Domain.Entities;
using TaskGenie.Infrastructure.BackgroundJobs;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Tests.Integration;

/// <summary>
/// The purge sweep — what finally makes a soft-delete permanent. Entitlements and every project
/// list already stop showing a Deleted project the instant it's marked; what's under test here is
/// solely the grace-period boundary and that the cascade actually runs once it's crossed.
/// </summary>
public sealed class ProjectPurgeWorkerTests
{
    [Fact]
    public async Task Sweep_PurgesAProjectPastItsGracePeriod()
    {
        await using var factory = new PurgeWorkerFactory();
        var projectId = await factory.SeedDeletedProjectAsync(deletedDaysAgo: 31);

        await factory.RunSweepAsync();

        await factory.WithDbAsync(db => Assert.False(db.Projects.Any(p => p.ProjectId == projectId)));
    }

    [Fact]
    public async Task Sweep_LeavesAProjectStillInsideItsGracePeriodAlone()
    {
        await using var factory = new PurgeWorkerFactory();
        var projectId = await factory.SeedDeletedProjectAsync(deletedDaysAgo: 5);

        await factory.RunSweepAsync();

        await factory.WithDbAsync(db => Assert.True(db.Projects.Any(p => p.ProjectId == projectId)));
    }

    [Fact]
    public async Task Sweep_AlsoPurgesTheProjectsTasks()
    {
        await using var factory = new PurgeWorkerFactory();
        var (projectId, taskId) = await factory.SeedDeletedProjectWithTaskAsync(deletedDaysAgo: 45);

        await factory.RunSweepAsync();

        await factory.WithDbAsync(db =>
        {
            Assert.False(db.Projects.Any(p => p.ProjectId == projectId));
            Assert.False(db.Tasks.Any(t => t.TaskId == taskId));
        });
    }

    [Fact]
    public async Task Sweep_NeverTouchesAnActiveProject()
    {
        await using var factory = new PurgeWorkerFactory();
        var projectId = await factory.SeedActiveProjectAsync();

        await factory.RunSweepAsync();

        await factory.WithDbAsync(db => Assert.True(db.Projects.Any(p => p.ProjectId == projectId)));
    }

    /// <summary>A second sweep over an already-purged project must not throw — there's nothing left
    /// to find, which is the steady state once the due set empties out.</summary>
    [Fact]
    public async Task Sweep_TwiceInARow_IsANoOpTheSecondTime()
    {
        await using var factory = new PurgeWorkerFactory();
        var projectId = await factory.SeedDeletedProjectAsync(deletedDaysAgo: 31);

        await factory.RunSweepAsync();
        await factory.RunSweepAsync();

        await factory.WithDbAsync(db => Assert.False(db.Projects.Any(p => p.ProjectId == projectId)));
    }
}

public sealed class PurgeWorkerFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = $"taskgenie-purge-{Guid.NewGuid()}";

    public PurgeWorkerFactory()
    {
        Environment.SetEnvironmentVariable("Jwt__Secret", "taskgenie-purge-worker-test-secret-32ch");
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
        });
    }

    /// <summary>
    /// Drives exactly one sweep. The worker is not registered under Testing, so it is constructed
    /// here rather than waiting on its timer — which also keeps the assertions deterministic.
    /// </summary>
    public async Task RunSweepAsync()
    {
        using var scope = Services.CreateScope();
        var worker = ActivatorUtilities.CreateInstance<ProjectPurgeWorker>(scope.ServiceProvider);
        await worker.RunOnceAsync(CancellationToken.None);
    }

    public async Task<int> SeedDeletedProjectAsync(int deletedDaysAgo)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();

        var owner = User.Create($"User {Guid.NewGuid():N}", $"user-{Guid.NewGuid():N}@purge.test", "hash");
        context.Users.Add(owner);
        await context.SaveChangesAsync();

        var project = Project.Create($"Project {Guid.NewGuid():N}", null, owner.UserId);
        project.MarkDeleted();
        context.Projects.Add(project);
        await context.SaveChangesAsync();

        // MarkDeleted stamps "now" — back-date it directly so the grace-period math is exact.
        project.GetType().GetProperty(nameof(Project.UpdatedAt))!
            .SetValue(project, DateTime.UtcNow.AddDays(-deletedDaysAgo));
        await context.SaveChangesAsync();

        return project.ProjectId;
    }

    public async Task<(int ProjectId, int TaskId)> SeedDeletedProjectWithTaskAsync(int deletedDaysAgo)
    {
        var projectId = await SeedDeletedProjectAsync(deletedDaysAgo);

        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var task = TaskGenie.Domain.Entities.Task.Create(projectId, "Leftover task", null);
        context.Tasks.Add(task);
        await context.SaveChangesAsync();

        return (projectId, task.TaskId);
    }

    public async Task<int> SeedActiveProjectAsync()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();

        var owner = User.Create($"User {Guid.NewGuid():N}", $"user-{Guid.NewGuid():N}@purge.test", "hash");
        context.Users.Add(owner);
        await context.SaveChangesAsync();

        var project = Project.Create($"Project {Guid.NewGuid():N}", null, owner.UserId);
        context.Projects.Add(project);
        await context.SaveChangesAsync();

        return project.ProjectId;
    }

    public async Task WithDbAsync(Action<AppDbContext> assertion)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        assertion(context);
        await Task.CompletedTask;
    }
}
