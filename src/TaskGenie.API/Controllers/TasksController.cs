using MediatR;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.API.Extensions;
using TaskGenie.Application.Features.Tasks.Commands;
using TaskGenie.Application.Features.Tasks.Queries;

namespace TaskGenie.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class TasksController(IMediator mediator) : ControllerBase
{
    [HttpGet("my")]
    public async Task<IActionResult> GetMyTasks()
        => Ok(await mediator.Send(new GetMyTasksQuery(HttpContext.GetCurrentUserId())));

    [HttpGet]
    public async Task<IActionResult> GetByProject([FromQuery] int projectId)
        => Ok(await mediator.Send(new GetTasksByProjectQuery(projectId)));

    /// <summary>
    /// The import template. Kept in step with the client's own builder in `lib/taskImport.ts` —
    /// two templates that disagree is worse than none, because the file looks right and fails.
    /// </summary>
    [HttpGet("template-csv")]
    public IActionResult DownloadTemplateCsv()
    {
        const string template =
            "ID,Task name,Description,Type,Priority,Deadline,Required skills,Depends on,Start date\r\n" +
            "1,Thiet ke man hinh dang nhap,Wireframe va luong dang nhap,Design,High,2026-09-01,UI/UX:4,,2026-08-25\r\n" +
            "2,Dung API dang nhap,\"Endpoint, JWT, refresh token\",Develop,High,2026-09-05,\"C#:4, SQL:3\",1,2026-09-02\r\n" +
            "3,Dung giao dien dang nhap,Noi API vao man hinh,Develop,Medium,2026-09-06,React:4,1,2026-09-02\r\n" +
            "4,Kiem thu luong dang nhap,Ca kiem thu dang nhap,Testing,Medium,2026-09-10,Testing:3,\"2, 3\",2026-09-07\r\n";

        var bytes = System.Text.Encoding.UTF8.GetBytes(template);
        // The BOM is what makes Excel read the file as UTF-8 rather than the local codepage.
        var bom = new byte[] { 0xEF, 0xBB, 0xBF };
        var result = new byte[bom.Length + bytes.Length];
        Buffer.BlockCopy(bom, 0, result, 0, bom.Length);
        Buffer.BlockCopy(bytes, 0, result, bom.Length, bytes.Length);
        return File(result, "text/csv", "taskgenie-task-import-template.csv");
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
        => Ok(await mediator.Send(new GetTaskByIdQuery(id)));

    /// <summary>The type catalog the create form offers. Reference data, readable by any signed-in user.</summary>
    [HttpGet("types")]
    public async Task<IActionResult> GetTypes([FromQuery] bool includeArchived = false)
        => Ok(await mediator.Send(new GetTaskTypesQuery(includeArchived)));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTaskRequest request)
    {
        var task = await mediator.Send(new CreateTaskCommand(
            request.ProjectId,
            request.Title,
            request.Description,
            request.Priority,
            request.Deadline,
            request.StartDate,
            request.Difficulty,
            request.TaskTypeId));
        return CreatedAtAction(nameof(GetById), new { id = task.TaskId }, task);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateTaskRequest request)
    {
        await mediator.Send(new UpdateTaskCommand(
            id,
            request.Title,
            request.Description,
            request.Status,
            request.Priority,
            request.Deadline,
            request.StartDate,
            request.EstimatedTime,
            request.ActualTime,
            request.Difficulty));
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await mediator.Send(new DeleteTaskCommand(id));
        return NoContent();
    }

    /// <summary>Returns the updated task so the caller can render authoritative state instead of
    /// trusting its own optimistic guess — the server may clamp progress or refuse a status move.</summary>
    [HttpPut("{id}/progress")]
    public async Task<IActionResult> UpdateProgress(int id, [FromBody] UpdateProgressRequest request)
    {
        await mediator.Send(new UpdateTaskProgressCommand(
            id,
            request.Status,
            request.Progress,
            request.RiskLevel,
            request.ActualTime));

        return Ok(await mediator.Send(new GetTaskByIdQuery(id)));
    }

    [HttpPost("{id}/estimate")]
    public async Task<IActionResult> SuggestEstimate(int id)
        => Ok(await mediator.Send(new SuggestEstimatedTimeCommand(id)));

    /// <summary>Assigns the task directly. A null userId clears the assignee.</summary>
    [HttpPost("{id}/assign")]
    public async Task<IActionResult> Assign(int id, [FromBody] AssignTaskRequest request)
    {
        await mediator.Send(new AssignTaskCommand(id, request.UserId));
        return Ok(await mediator.Send(new GetTaskByIdQuery(id)));
    }

    [HttpPost("{id}/dependencies")]
    public async Task<IActionResult> AddDependency(int id, [FromBody] AddDependencyRequest request)
    {
        await mediator.Send(new AddTaskDependencyCommand(id, request.DependsOnTaskId));
        return Ok(new { success = true });
    }

    [HttpDelete("{id}/dependencies/{dependencyId}")]
    public async Task<IActionResult> RemoveDependency(int id, int dependencyId)
    {
        await mediator.Send(new RemoveTaskDependencyCommand(id, dependencyId));
        return Ok(new { success = true });
    }

    [HttpGet("project/{projectId}/dependency-graph")]
    public async Task<IActionResult> GetDependencyGraph(int projectId)
        => Ok(await mediator.Send(new GetDependencyGraphQuery(projectId)));
}

public record CreateTaskRequest(
    int ProjectId,
    string Title,
    string? Description,
    string? Priority,
    string? Deadline,
    string? StartDate,
    int? Difficulty,
    int? TaskTypeId = null);

public record UpdateTaskRequest(
    string? Title,
    string? Description,
    string? Status,
    string? Priority,
    string? Deadline,
    string? StartDate,
    int? EstimatedTime,
    int? ActualTime,
    int? Difficulty);

public record UpdateProgressRequest(
    string? Status,
    int? Progress,
    string? RiskLevel,
    int? ActualTime);

public record AddDependencyRequest(int DependsOnTaskId);

/// <summary>Null clears the assignee rather than assigning nobody-in-particular.</summary>
public record AssignTaskRequest(int? UserId);
