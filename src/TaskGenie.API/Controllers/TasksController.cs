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

    [HttpGet("template-csv")]
    public IActionResult DownloadTemplateCsv()
    {
        const string template = "Title,Description,Priority,EstimatedTime,Deadline\nTask mau 1,Mo ta task mau,High,4,2023-12-31\nTask mau 2,Mo ta khac,Medium,8,";
        var bytes = System.Text.Encoding.UTF8.GetBytes(template);
        var bom = new byte[] { 0xEF, 0xBB, 0xBF };
        var result = new byte[bom.Length + bytes.Length];
        Buffer.BlockCopy(bom, 0, result, 0, bom.Length);
        Buffer.BlockCopy(bytes, 0, result, bom.Length, bytes.Length);
        return File(result, "text/csv", "Template.csv");
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
        => Ok(await mediator.Send(new GetTaskByIdQuery(id)));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTaskRequest request)
    {
        var task = await mediator.Send(new CreateTaskCommand(
            request.ProjectId,
            request.Title,
            request.Description,
            request.Priority,
            request.Deadline,
            request.Difficulty));
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

    [HttpPut("{id}/progress")]
    public async Task<IActionResult> UpdateProgress(int id, [FromBody] UpdateProgressRequest request)
    {
        await mediator.Send(new UpdateTaskProgressCommand(
            id,
            request.Status,
            request.Progress,
            request.RiskLevel,
            request.ActualTime));
        return NoContent();
    }

    [HttpPost("{id}/estimate")]
    public async Task<IActionResult> SuggestEstimate(int id)
        => Ok(await mediator.Send(new SuggestEstimatedTimeCommand(id)));

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
    int? Difficulty);

public record UpdateTaskRequest(
    string? Title,
    string? Description,
    string? Status,
    string? Priority,
    string? Deadline,
    int? EstimatedTime,
    int? ActualTime,
    int? Difficulty);

public record UpdateProgressRequest(
    string? Status,
    int? Progress,
    string? RiskLevel,
    int? ActualTime);

public record AddDependencyRequest(int DependsOnTaskId);
