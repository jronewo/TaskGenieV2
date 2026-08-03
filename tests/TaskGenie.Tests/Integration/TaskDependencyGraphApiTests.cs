using System.Net;
using System.Net.Http.Json;
using TaskGenie.Application.Features.Tasks.DTOs;

namespace TaskGenie.Tests.Integration;

/// <summary>
/// Dependencies decide what may be worked on and what may be closed, so the rules that matter are
/// that a loop can never be created, and that the ordering the diagram draws is the real one.
/// </summary>
public sealed class TaskDependencyGraphApiTests
{
    private static async Task<HttpResponseMessage> AddDependencyAsync(
        HttpClient client, int taskId, int dependsOnTaskId) =>
        await client.PostAsJsonAsync($"/api/tasks/{taskId}/dependencies", new { dependsOnTaskId });

    [Fact]
    public async Task ADirectLoop_IsRefused()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner);
        var a = await factory.SeedTaskAsync(projectId);
        var b = await factory.SeedTaskAsync(projectId);
        await factory.AuthenticateAsync(client, owner);

        Assert.Equal(HttpStatusCode.OK, (await AddDependencyAsync(client, b, a)).StatusCode);

        // A waits on B while B already waits on A: neither could ever reach Done, because Done
        // requires every dependency to be Done first.
        var response = await AddDependencyAsync(client, a, b);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AnIndirectLoop_IsRefused()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner);
        var a = await factory.SeedTaskAsync(projectId);
        var b = await factory.SeedTaskAsync(projectId);
        var c = await factory.SeedTaskAsync(projectId);
        await factory.AuthenticateAsync(client, owner);

        await AddDependencyAsync(client, b, a); // b waits on a
        await AddDependencyAsync(client, c, b); // c waits on b

        // a waiting on c closes the ring a -> b -> c -> a. A direct-only check would miss this.
        var response = await AddDependencyAsync(client, a, c);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ADiamond_IsAllowed_BecauseItIsNotALoop()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner);
        var design = await factory.SeedTaskAsync(projectId);
        var api = await factory.SeedTaskAsync(projectId);
        var ui = await factory.SeedTaskAsync(projectId);
        var release = await factory.SeedTaskAsync(projectId);
        await factory.AuthenticateAsync(client, owner);

        await AddDependencyAsync(client, api, design);
        await AddDependencyAsync(client, ui, design);
        Assert.Equal(HttpStatusCode.OK, (await AddDependencyAsync(client, release, api)).StatusCode);
        // Two paths reaching the same task is normal planning, not a cycle.
        Assert.Equal(HttpStatusCode.OK, (await AddDependencyAsync(client, release, ui)).StatusCode);
    }

    [Fact]
    public async Task TheGraph_OrdersTasksByWhatMustFinishFirst()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner);
        var design = await factory.SeedTaskAsync(projectId);
        var api = await factory.SeedTaskAsync(projectId);
        var release = await factory.SeedTaskAsync(projectId);
        await factory.AuthenticateAsync(client, owner);

        await AddDependencyAsync(client, api, design);
        await AddDependencyAsync(client, release, api);

        var graph = await client.GetFromJsonAsync<DependencyGraphDto>(
            $"/api/tasks/project/{projectId}/dependency-graph");

        int LevelOf(int id) => graph!.Nodes.Single(n => n.Id == id.ToString()).Level;

        Assert.Equal(0, LevelOf(design));
        Assert.Equal(1, LevelOf(api));
        Assert.Equal(2, LevelOf(release));
        Assert.Equal(3, graph!.LevelCount);
        Assert.False(graph.HasCycle);
    }

    [Fact]
    public async Task ATaskSitsBelowItsLatestPrerequisite_NotItsFirst()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner);
        var quick = await factory.SeedTaskAsync(projectId);
        var slowA = await factory.SeedTaskAsync(projectId);
        var slowB = await factory.SeedTaskAsync(projectId);
        var final = await factory.SeedTaskAsync(projectId);
        await factory.AuthenticateAsync(client, owner);

        await AddDependencyAsync(client, slowB, slowA);   // slowB is at level 1
        await AddDependencyAsync(client, final, quick);   // quick is at level 0
        await AddDependencyAsync(client, final, slowB);

        var graph = await client.GetFromJsonAsync<DependencyGraphDto>(
            $"/api/tasks/project/{projectId}/dependency-graph");

        // Level 1 would be wrong: the task still has to wait for the slowB chain to finish.
        Assert.Equal(2, graph!.Nodes.Single(n => n.Id == final.ToString()).Level);
    }

    [Fact]
    public async Task TheGraph_MarksWhatCanBeStartedNow()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner);
        var first = await factory.SeedTaskAsync(projectId);
        var second = await factory.SeedTaskAsync(projectId);
        await factory.AuthenticateAsync(client, owner);

        await AddDependencyAsync(client, second, first);

        var graph = await client.GetFromJsonAsync<DependencyGraphDto>(
            $"/api/tasks/project/{projectId}/dependency-graph");

        var firstNode = graph!.Nodes.Single(n => n.Id == first.ToString());
        var secondNode = graph.Nodes.Single(n => n.Id == second.ToString());

        Assert.True(firstNode.IsReady);
        Assert.Equal(1, firstNode.BlocksCount);
        Assert.False(secondNode.IsReady);
        Assert.Equal(1, secondNode.BlockedByCount);
        Assert.True(graph.Edges.Single().IsBlocking);
    }

    [Fact]
    public async Task AnOutsider_CannotReadTheGraph()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner);
        await factory.SeedTaskAsync(projectId);
        await factory.AuthenticateAsync(client, outsider);

        var response = await client.GetAsync($"/api/tasks/project/{projectId}/dependency-graph");

        // The diagram exposes every task title in the project, so it needs the same gate as the board.
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
