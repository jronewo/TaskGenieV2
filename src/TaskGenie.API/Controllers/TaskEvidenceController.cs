using MediatR;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.API.Extensions;
using TaskGenie.Application.Features.Evidence;

namespace TaskGenie.API.Controllers;

[ApiController]
[Route("api/tasks/{taskId:int}/evidence")]
public sealed class TaskEvidenceController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(int taskId)
        => Ok(await mediator.Send(new GetTaskEvidenceQuery(taskId)));

    [HttpPost]
    public async Task<IActionResult> Create(int taskId, [FromBody] CreateTaskEvidenceRequest request)
    {
        var evidence = await mediator.Send(new CreateTaskEvidenceCommand(
            taskId,
            HttpContext.GetCurrentUserId(),
            request.EvidenceType,
            request.Description,
            request.TaskLogId,
            request.ExternalUrl,
            request.FileName,
            request.MimeType,
            request.SizeBytes,
            request.StorageUrl,
            request.StoragePublicId));
        return CreatedAtAction(nameof(Get), new { taskId }, evidence);
    }
}

public sealed record CreateTaskEvidenceRequest(
    string EvidenceType,
    string? Description,
    int? TaskLogId,
    string? ExternalUrl,
    string? FileName,
    string? MimeType,
    long? SizeBytes,
    string? StorageUrl,
    string? StoragePublicId);
