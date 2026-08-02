using System.Net;
using System.Net.Http.Json;
using TaskGenie.Application.Features.Tasks.DTOs;
using TaskGenie.Application.Features.Tasks.Queries;

namespace TaskGenie.Tests.Integration;

/// <summary>
/// Task types replaced a regex over the title that filed "Fix the pricing copy" as a defect and
/// every Vietnamese title as a plain Task. These cover the catalog and that a chosen type sticks.
/// </summary>
public sealed class TaskTypeApiTests
{
    [Fact]
    public async Task Types_AreSeededAndReadableBySignedInUsers()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user);

        var response = await client.GetAsync("/api/tasks/types");
        var types = await response.Content.ReadFromJsonAsync<List<TaskTypeDto>>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains(types!, t => t.Code == "BUG");
        Assert.Contains(types!, t => t.Code == "TESTING");
        Assert.Contains(types!, t => t.Code == "MIGRATION");
        Assert.Contains(types!, t => t.Code == "DEVELOP");
        Assert.All(types!, t => Assert.True(t.IsActive));
    }

    [Fact]
    public async Task Types_RequireAuthentication()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/tasks/types");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreatingATask_KeepsTheChosenType()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner);
        await factory.AuthenticateAsync(client, owner);

        var types = await client.GetFromJsonAsync<List<TaskTypeDto>>("/api/tasks/types");
        var bug = types!.Single(t => t.Code == "BUG");

        var response = await client.PostAsJsonAsync("/api/tasks", new
        {
            projectId,
            title = "Sửa lỗi đăng nhập",
            description = (string?)null,
            priority = "High",
            deadline = (string?)null,
            difficulty = (int?)null,
            taskTypeId = bug.TaskTypeId
        });
        var created = await response.Content.ReadFromJsonAsync<TaskDetailDto>();

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            var task = context.Tasks.Single(t => t.TaskId == created!.TaskId);
            // A Vietnamese title the old heuristic could never classify.
            Assert.Equal(bug.TaskTypeId, task.TaskTypeId);
        });
    }

    [Fact]
    public async Task ATaskWithNoType_IsStillCreated()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PostAsJsonAsync("/api/tasks", new
        {
            projectId,
            title = "Unclassified work",
            description = (string?)null,
            priority = (string?)null,
            deadline = (string?)null,
            difficulty = (int?)null
        });

        // Classification is optional; requiring it would block the quick-add path.
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task TheBoardList_CarriesTheTypeNameAndColour_NotJustTheId()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner);
        await factory.AuthenticateAsync(client, owner);

        var types = await client.GetFromJsonAsync<List<TaskTypeDto>>("/api/tasks/types");
        var develop = types!.Single(t => t.Code == "DEVELOP");

        await client.PostAsJsonAsync("/api/tasks", new
        {
            projectId,
            title = "Tạo database",
            description = (string?)null,
            priority = "High",
            deadline = (string?)null,
            difficulty = (int?)null,
            taskTypeId = develop.TaskTypeId
        });

        var board = await client.GetFromJsonAsync<List<TaskDetailDto>>($"/api/tasks?projectId={projectId}");
        var card = board!.Single();

        // The list query missed the include, so cards received an id with no name and fell back to
        // the old title-guessing icon — the id alone is not enough to render a chip.
        Assert.Equal(develop.TaskTypeId, card.TaskTypeId);
        Assert.Equal("Develop", card.TaskTypeName);
        Assert.False(string.IsNullOrWhiteSpace(card.TaskTypeColor));
    }
}
