using MediatR;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.API.Extensions;
using TaskGenie.Application.Features.TaskComments.Commands;
using TaskGenie.Application.Features.TaskComments.Queries;

namespace TaskGenie.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class TaskCommentsController(IMediator mediator) : ControllerBase
{
    [HttpGet("task/{taskId}")]
    public async Task<IActionResult> GetByTask(int taskId)
        => Ok(await mediator.Send(new GetTaskCommentsQuery(taskId)));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTaskCommentRequest request)
        => Ok(await mediator.Send(new CreateTaskCommentCommand(
            request.TaskId,
            HttpContext.GetCurrentUserId(),
            request.Content,
            request.ImageUrl)));

    [HttpDelete("{commentId}")]
    public async Task<IActionResult> Delete(int commentId)
    {
        await mediator.Send(new DeleteTaskCommentCommand(commentId));
        return NoContent();
    }
}

public record CreateTaskCommentRequest(int TaskId, string? Content, string? ImageUrl);
