using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using TaskGenie.Application.Features.Tasks.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;
using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Tests.Integration;

public sealed class TaskAuthorizationApiTests
{
    [Fact]
    public async Task Create_Anonymous_ReturnsUnauthorized()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner);

        var response = await client.PostAsJsonAsync("/api/tasks", new
        {
            projectId,
            title = "No auth",
            description = (string?)null,
            priority = (string?)null,
            deadline = (string?)null,
            difficulty = (int?)null
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Create_PlainMember_ReturnsForbidden()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner, extraMemberUserIds: [member]);
        await factory.AuthenticateAsync(client, member);

        var response = await client.PostAsJsonAsync("/api/tasks", new
        {
            projectId,
            title = "Member cannot create",
            description = (string?)null,
            priority = (string?)null,
            deadline = (string?)null,
            difficulty = (int?)null
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Create_TeamLeader_SucceedsAndActorIsFromJwt()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var leader = await factory.SeedUserAsync();
        var impersonated = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner, extraMemberUserIds: [leader], extraMemberRole: "LEADER");
        await factory.AuthenticateAsync(client, leader);

        var response = await client.PostAsJsonAsync("/api/tasks", new
        {
            projectId,
            title = "Leader can create",
            description = (string?)null,
            priority = (string?)null,
            deadline = (string?)null,
            difficulty = (int?)null
        });
        var payload = await response.Content.ReadFromJsonAsync<TaskDetailDto>();

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            var task = context.Tasks.Single(t => t.TaskId == payload!.TaskId);
            Assert.Equal(leader, task.CreatedBy);
            Assert.NotEqual(impersonated, task.CreatedBy);
        });
    }

    [Fact]
    public async Task GetById_PlainMember_CanRead()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var (_, teamId) = await factory.SeedProjectWithTeamAsync(owner, extraMemberUserIds: [member]);
        var taskId = await factory.SeedTaskAsync((await factory.GetProjectIdForTeamAsync(teamId)));
        await factory.AuthenticateAsync(client, member);

        var response = await client.GetAsync($"/api/tasks/{taskId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetById_Outsider_ReturnsForbidden()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner);
        var taskId = await factory.SeedTaskAsync(projectId);
        await factory.AuthenticateAsync(client, outsider);

        var response = await client.GetAsync($"/api/tasks/{taskId}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetById_NonExistentTask_ReturnsNotFound()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user);

        var response = await client.GetAsync("/api/tasks/999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Update_PlainMember_ReturnsForbidden_ButLeaderSucceeds()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var leader = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(
            owner, extraMemberUserIds: [member, leader], extraMemberRoles: ["MEMBER", "LEADER"]);
        var taskId = await factory.SeedTaskAsync(projectId);

        await factory.AuthenticateAsync(client, member);
        var memberResponse = await client.PutAsJsonAsync($"/api/tasks/{taskId}", new
        {
            title = "Member edit",
            description = (string?)null,
            status = (string?)null,
            priority = (string?)null,
            deadline = (string?)null,
            estimatedTime = (int?)null,
            actualTime = (int?)null,
            difficulty = (int?)null
        });
        Assert.Equal(HttpStatusCode.Forbidden, memberResponse.StatusCode);

        await factory.AuthenticateAsync(client, leader);
        var leaderResponse = await client.PutAsJsonAsync($"/api/tasks/{taskId}", new
        {
            title = "Leader edit",
            description = (string?)null,
            status = (string?)null,
            priority = (string?)null,
            deadline = (string?)null,
            estimatedTime = (int?)null,
            actualTime = (int?)null,
            difficulty = (int?)null
        });
        Assert.Equal(HttpStatusCode.NoContent, leaderResponse.StatusCode);
    }

    [Fact]
    public async Task Delete_PlainMember_ReturnsForbidden()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner, extraMemberUserIds: [member]);
        var taskId = await factory.SeedTaskAsync(projectId);
        await factory.AuthenticateAsync(client, member);

        var response = await client.DeleteAsync($"/api/tasks/{taskId}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Delete_ProjectCreator_Succeeds()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner);
        var taskId = await factory.SeedTaskAsync(projectId);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.DeleteAsync($"/api/tasks/{taskId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Progress_PlainMember_ReturnsForbidden()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner, extraMemberUserIds: [member]);
        var taskId = await factory.SeedTaskAsync(projectId);
        await factory.AuthenticateAsync(client, member);

        var response = await client.PutAsJsonAsync($"/api/tasks/{taskId}/progress", new
        {
            status = "InProgress",
            progress = 50,
            riskLevel = (string?)null,
            actualTime = (int?)null
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AddDependency_CrossProject_ReturnsBadRequest()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (projectAId, _) = await factory.SeedProjectWithTeamAsync(owner);
        var (projectBId, _) = await factory.SeedProjectWithTeamAsync(owner);
        var taskInA = await factory.SeedTaskAsync(projectAId);
        var taskInB = await factory.SeedTaskAsync(projectBId);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PostAsJsonAsync($"/api/tasks/{taskInA}/dependencies", new { dependsOnTaskId = taskInB });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddDependency_SameProject_Succeeds()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner);
        var taskA = await factory.SeedTaskAsync(projectId);
        var taskB = await factory.SeedTaskAsync(projectId);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PostAsJsonAsync($"/api/tasks/{taskA}/dependencies", new { dependsOnTaskId = taskB });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task AddDependency_SelfDependency_ReturnsBadRequest()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner);
        var taskA = await factory.SeedTaskAsync(projectId);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PostAsJsonAsync($"/api/tasks/{taskA}/dependencies", new { dependsOnTaskId = taskA });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddDependency_Duplicate_ReturnsBadRequest()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner);
        var taskA = await factory.SeedTaskAsync(projectId);
        var taskB = await factory.SeedTaskAsync(projectId);
        await factory.AuthenticateAsync(client, owner);

        var first = await client.PostAsJsonAsync($"/api/tasks/{taskA}/dependencies", new { dependsOnTaskId = taskB });
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        var duplicate = await client.PostAsJsonAsync($"/api/tasks/{taskA}/dependencies", new { dependsOnTaskId = taskB });

        Assert.Equal(HttpStatusCode.BadRequest, duplicate.StatusCode);
    }

    [Fact]
    public async Task RemoveDependency_NotBelongingToTask_ReturnsNotFound()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner);
        var taskA = await factory.SeedTaskAsync(projectId);
        var taskB = await factory.SeedTaskAsync(projectId);
        var taskC = await factory.SeedTaskAsync(projectId);
        await factory.AuthenticateAsync(client, owner);

        // Dependency created on taskB, then attempted removal via taskA's route.
        var created = await client.PostAsJsonAsync($"/api/tasks/{taskB}/dependencies", new { dependsOnTaskId = taskC });
        Assert.Equal(HttpStatusCode.OK, created.StatusCode);
        var dependencyId = await factory.GetDependencyIdAsync(taskB, taskC);

        var response = await client.DeleteAsync($"/api/tasks/{taskA}/dependencies/{dependencyId}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task RemoveDependency_NonExistentDependency_ReturnsNotFound()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner);
        var taskA = await factory.SeedTaskAsync(projectId);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.DeleteAsync($"/api/tasks/{taskA}/dependencies/999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task UpdateProgress_OutOfRange_ReturnsBadRequest()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner);
        var taskId = await factory.SeedTaskAsync(projectId);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PutAsJsonAsync($"/api/tasks/{taskId}/progress", new
        {
            status = "InProgress",
            progress = 150,
            riskLevel = (string?)null,
            actualTime = (int?)null
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task LogProgress_OutOfRange_ReturnsBadRequest()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner);
        var taskId = await factory.SeedTaskAsync(projectId);
        await factory.AuthenticateAsync(client, owner);

        var response = await client.PutAsJsonAsync($"/api/task-progress/{taskId}", new
        {
            progress = -5,
            note = (string?)null,
            risk = (string?)null
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_DoesNotAcceptActorFromRequestBody()
    {
        // CreateTaskCommand no longer has a CurrentUserId field; the actor always comes from
        // the JWT even if the client tries to sneak an extra field into the request body.
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var actualActor = await factory.SeedUserAsync();
        var impersonated = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(actualActor);
        await factory.AuthenticateAsync(client, actualActor);

        var response = await client.PostAsJsonAsync("/api/tasks", new
        {
            projectId,
            title = "Forged actor",
            description = (string?)null,
            priority = (string?)null,
            deadline = (string?)null,
            difficulty = (int?)null,
            currentUserId = impersonated
        });
        var payload = await response.Content.ReadFromJsonAsync<TaskDetailDto>();

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        await factory.WithDbAsync(context =>
        {
            var task = context.Tasks.Single(t => t.TaskId == payload!.TaskId);
            Assert.Equal(actualActor, task.CreatedBy);
            Assert.NotEqual(impersonated, task.CreatedBy);
        });
    }

    [Fact]
    public async Task AddDependency_PlainMember_ReturnsForbidden()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner, extraMemberUserIds: [member]);
        var taskA = await factory.SeedTaskAsync(projectId);
        var taskB = await factory.SeedTaskAsync(projectId);
        await factory.AuthenticateAsync(client, member);

        var response = await client.PostAsJsonAsync($"/api/tasks/{taskA}/dependencies", new { dependsOnTaskId = taskB });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task RequiredSkills_Replace_PlainMember_ReturnsForbidden_LeaderSucceeds()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner, extraMemberUserIds: [member]);
        var taskId = await factory.SeedTaskAsync(projectId);

        await factory.AuthenticateAsync(client, member);
        var memberResponse = await client.PostAsJsonAsync($"/api/taskrequiredskills/{taskId}", new { skillIds = new List<int>() });
        Assert.Equal(HttpStatusCode.Forbidden, memberResponse.StatusCode);

        await factory.AuthenticateAsync(client, owner);
        var ownerResponse = await client.PostAsJsonAsync($"/api/taskrequiredskills/{taskId}", new { skillIds = new List<int>() });
        Assert.Equal(HttpStatusCode.OK, ownerResponse.StatusCode);
    }

    [Fact]
    public async Task RequiredSkills_Get_PlainMember_ReturnsOk()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner, extraMemberUserIds: [member]);
        var taskId = await factory.SeedTaskAsync(projectId);
        await factory.AuthenticateAsync(client, member);

        var response = await client.GetAsync($"/api/taskrequiredskills/{taskId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task TaskProgressLog_Write_PlainMember_ReturnsForbidden_LeaderSucceeds()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var member = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner, extraMemberUserIds: [member]);
        var taskId = await factory.SeedTaskAsync(projectId);

        await factory.AuthenticateAsync(client, member);
        var memberResponse = await client.PutAsJsonAsync($"/api/task-progress/{taskId}", new { progress = 20, note = (string?)null, risk = (string?)null });
        Assert.Equal(HttpStatusCode.Forbidden, memberResponse.StatusCode);

        await factory.AuthenticateAsync(client, owner);
        var ownerResponse = await client.PutAsJsonAsync($"/api/task-progress/{taskId}", new { progress = 20, note = (string?)null, risk = (string?)null });
        Assert.Equal(HttpStatusCode.OK, ownerResponse.StatusCode);
    }

    [Fact]
    public async Task TaskProgressLog_Read_Outsider_ReturnsForbidden()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner);
        var taskId = await factory.SeedTaskAsync(projectId);
        await factory.AuthenticateAsync(client, outsider);

        var response = await client.GetAsync($"/api/task-progress/{taskId}/logs");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetByProject_Outsider_ReturnsForbidden()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner);
        await factory.AuthenticateAsync(client, outsider);

        var response = await client.GetAsync($"/api/tasks?projectId={projectId}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DependencyGraph_Outsider_ReturnsForbidden()
    {
        await using var factory = new TaskAuthorizationApiFactory();
        using var client = factory.CreateClient();
        var owner = await factory.SeedUserAsync();
        var outsider = await factory.SeedUserAsync();
        var (projectId, _) = await factory.SeedProjectWithTeamAsync(owner);
        await factory.AuthenticateAsync(client, outsider);

        var response = await client.GetAsync($"/api/tasks/project/{projectId}/dependency-graph");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}

public sealed class TaskAuthorizationApiFactory : WebApplicationFactory<Program>
{
    private const string TestJwtSecret = "taskgenie-task-authz-test-secret-32chars-x";
    private readonly string _databaseName = $"taskgenie-task-authz-{Guid.NewGuid()}";

    public TaskAuthorizationApiFactory()
    {
        Environment.SetEnvironmentVariable("Jwt__Secret", TestJwtSecret);
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

    public async Task<int> SeedUserAsync()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();
        var user = User.Create($"User {Guid.NewGuid():N}", $"user-{Guid.NewGuid():N}@tasks.test", "hash");
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user.UserId;
    }

    public async Task<(int ProjectId, int TeamId)> SeedProjectWithTeamAsync(
        int owner, int[]? extraMemberUserIds = null, string extraMemberRole = "MEMBER", string[]? extraMemberRoles = null)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var team = Team.Create($"Team {Guid.NewGuid():N}", null, owner);
        context.Teams.Add(team);
        await context.SaveChangesAsync();

        context.TeamMembers.Add(TeamMember.Create(team.TeamId, owner, "LEADER"));
        var members = extraMemberUserIds ?? [];
        for (var i = 0; i < members.Length; i++)
        {
            var role = extraMemberRoles is { Length: > 0 } ? extraMemberRoles[i] : extraMemberRole;
            context.TeamMembers.Add(TeamMember.Create(team.TeamId, members[i], role));
        }
        await context.SaveChangesAsync();

        var project = Project.Create($"Project {Guid.NewGuid():N}", null, owner);
        project.SetTeamId(team.TeamId);
        context.Projects.Add(project);
        await context.SaveChangesAsync();

        return (project.ProjectId, team.TeamId);
    }

    public async Task<int> GetProjectIdForTeamAsync(int teamId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var project = await context.Projects.SingleAsync(p => p.TeamId == teamId);
        return project.ProjectId;
    }

    public async Task<int> SeedTaskAsync(int projectId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var task = TaskEntity.Create(projectId, $"Task {Guid.NewGuid():N}", null);
        context.Tasks.Add(task);
        await context.SaveChangesAsync();
        return task.TaskId;
    }

    public async Task<int> GetDependencyIdAsync(int taskId, int dependsOnTaskId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var dependency = await context.TaskDependencies.SingleAsync(
            d => d.TaskId == taskId && d.DependsOnTaskId == dependsOnTaskId);
        return dependency.DependencyId;
    }

    public async Task AuthenticateAsync(HttpClient client, int userId, string role = "NORMAL_USER")
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await context.Users.SingleAsync(item => item.UserId == userId);
        var tokenService = scope.ServiceProvider.GetRequiredService<IJwtTokenService>();
        var token = tokenService.GenerateToken(user.UserId, user.Email, role);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token.AccessToken);
    }

    public async Task WithDbAsync(Action<AppDbContext> assertion)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        assertion(context);
        await Task.CompletedTask;
    }
}
