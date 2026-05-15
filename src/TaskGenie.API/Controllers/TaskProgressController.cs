using MediatR;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.Application.Features.Tasks.Commands;
using TaskGenie.Application.Features.Tasks.Queries;

namespace TaskGenie.API.Controllers;

[Route("api/task-progress")]
[ApiController]
public class TaskProgressController(IMediator mediator) : ControllerBase
{
    [HttpPut("{taskId}")]
    public async Task<IActionResult> UpdateProgress(int taskId, [FromBody] LogProgressRequest request)
    {
        await mediator.Send(new LogTaskProgressCommand(taskId, request.Progress, request.Note, request.Risk));
        return Ok(new { message = "Progress updated successfully." });
    }

    [HttpGet("{taskId}/logs")]
    public async Task<IActionResult> GetProgressLogs(int taskId)
        => Ok(await mediator.Send(new GetTaskProgressLogsQuery(taskId)));
}

public record LogProgressRequest(int Progress, string? Note, string? Risk);
