using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TaskGenie.Application.Features.Projects.DTOs;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Tests.Integration;

/// <summary>
/// Closing a project must move it out of the active workspace without deleting it: the lists that
/// drive the sidebar, the board switcher and the dashboard must stop returning it, while the
/// profile's finished-work list must still find it.
/// </summary>
public sealed class ProjectClosureApiTests
{
    [Fact]
    public async Task Close_MovesProjectOutOfActiveListAndIntoClosedList()
    {
        await using var factory = new ProjectLifecycleApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, owner);
        var (project, _) = await factory.SeedProjectWithDedicatedTeamAsync(owner);

        var active = await client.GetFromJsonAsync<List<ProjectDto>>("/api/projects");
        Assert.Contains(active!, p => p.ProjectId == project.ProjectId);

        var closeResponse = await client.PostAsync($"/api/projects/{project.ProjectId}/close", null);
        Assert.Equal(HttpStatusCode.OK, closeResponse.StatusCode);

        var afterActive = await client.GetFromJsonAsync<List<ProjectDto>>("/api/projects");
        Assert.DoesNotContain(afterActive!, p => p.ProjectId == project.ProjectId);

        var closed = await client.GetFromJsonAsync<List<ProjectDto>>("/api/projects?closed=true");
        var row = Assert.Single(closed!, p => p.ProjectId == project.ProjectId);
        Assert.Equal("Completed", row.Status);
    }

    [Fact]
    public async Task Close_IsRejectedWhenTheProjectIsAlreadyClosed()
    {
        await using var factory = new ProjectLifecycleApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, owner);
        var (project, _) = await factory.SeedProjectWithDedicatedTeamAsync(owner);

        await client.PostAsync($"/api/projects/{project.ProjectId}/close", null);
        var second = await client.PostAsync($"/api/projects/{project.ProjectId}/close", null);

        // InvalidOperationException maps to 400 in ExceptionHandlingMiddleware.
        Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);
    }

    [Fact]
    public async Task Close_IsRefusedToSomeoneWhoDoesNotManageTheProject()
    {
        await using var factory = new ProjectLifecycleApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var (project, _) = await factory.SeedProjectWithDedicatedTeamAsync(owner);
        await factory.AuthenticateAsync(client, outsider);

        var response = await client.PostAsync($"/api/projects/{project.ProjectId}/close", null);

        Assert.True(
            response.StatusCode is HttpStatusCode.Forbidden or HttpStatusCode.NotFound,
            $"Expected 403 or 404 for a non-manager, got {(int)response.StatusCode}.");

        // Whatever the status code, the project must still be open.
        await factory.WithDbAsync(context =>
        {
            var stored = context.Projects.Single(p => p.ProjectId == project.ProjectId);
            Assert.NotEqual("Completed", stored.Status);
        });
    }

    /// <summary>
    /// Deleting a project used to remove the project row alone, leaving its tasks' assignments,
    /// comments, logs, dependencies, scores and activity entries pointing at ids that no longer
    /// existed. Nothing may survive the delete.
    /// </summary>
    [Fact]
    public async Task Delete_RemovesEveryTaskRelatedRowOfTheProject()
    {
        await using var factory = new ProjectLifecycleApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, owner);
        var (project, _) = await factory.SeedProjectWithDedicatedTeamAsync(owner);
        var taskId = await factory.SeedTaskWithChildrenAsync(project.ProjectId, owner);

        var response = await client.DeleteAsync($"/api/projects/{project.ProjectId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            Assert.False(context.Projects.Any(p => p.ProjectId == project.ProjectId));
            Assert.False(context.Tasks.Any(t => t.ProjectId == project.ProjectId));
            Assert.False(context.TaskAssignees.Any(a => a.TaskId == taskId));
            Assert.False(context.TaskComments.Any(c => c.TaskId == taskId));
            Assert.False(context.TaskLogs.Any(l => l.TaskId == taskId));
            Assert.False(context.TaskDependencies.Any(d => d.TaskId == taskId || d.DependsOnTaskId == taskId));
            Assert.False(context.UserScores.Any(s => s.TaskId == taskId || s.ProjectId == project.ProjectId));
            Assert.False(context.ActivityLogs.Any(l => l.EntityType == "TASK" && l.EntityId == taskId));
        });
    }

    /// <summary>Ending a project is not deleting it: every task and score must still be there.</summary>
    [Fact]
    public async Task Close_KeepsTheTasksAndScoresOfTheProject()
    {
        await using var factory = new ProjectLifecycleApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, owner);
        var (project, _) = await factory.SeedProjectWithDedicatedTeamAsync(owner);
        var taskId = await factory.SeedTaskWithChildrenAsync(project.ProjectId, owner);

        var response = await client.PostAsync($"/api/projects/{project.ProjectId}/close", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            Assert.True(context.Tasks.Any(t => t.TaskId == taskId));
            Assert.True(context.TaskComments.Any(c => c.TaskId == taskId));
            Assert.True(context.UserScores.Any(s => s.TaskId == taskId));
        });
    }

    [Fact]
    public async Task ClosedList_IsEmptyWhileEveryProjectIsStillOpen()
    {
        await using var factory = new ProjectLifecycleApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, owner);
        await factory.SeedProjectWithDedicatedTeamAsync(owner);

        var closed = await client.GetFromJsonAsync<List<ProjectDto>>("/api/projects?closed=true");

        Assert.Empty(closed!);
    }
}
