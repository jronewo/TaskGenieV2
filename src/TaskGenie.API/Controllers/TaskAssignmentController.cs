using MediatR;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.Application.Features.AI.Commands;
using TaskGenie.Application.Features.AI.Queries;

namespace TaskGenie.API.Controllers;

[Route("api/task-assignment")]
[ApiController]
public class TaskAssignmentController(IMediator mediator) : ControllerBase
{
    [HttpPost("recommend")]
    public async Task<IActionResult> GetRecommendations([FromBody] TaskAssignmentRequest request)
        => Ok(await mediator.Send(new GetAssignmentRecommendationsCommand(request.TaskId, request.ProjectId)));

    [HttpPost("accept")]
    public async Task<IActionResult> AcceptRecommendation([FromBody] AcceptRecommendationRequest request)
    {
        await mediator.Send(new AcceptAssignmentRecommendationCommand(
            request.TaskId,
            request.UserId,
            request.Outcome));
        return Ok(new { message = "Successfully assigned user to the task." });
    }

    [HttpPost("reject")]
    public async Task<IActionResult> RejectRecommendation([FromBody] RejectRecommendationRequest request)
    {
        await mediator.Send(new RejectAssignmentRecommendationCommand(
            request.TaskId,
            request.UserId,
            request.Reason));
        return Ok(new { message = "Recommendation rejected and feedback recorded." });
    }

    [HttpGet("task/{taskId}/history")]
    public async Task<IActionResult> GetRecommendationHistory(int taskId)
        => Ok(await mediator.Send(new GetAssignmentRecommendationHistoryQuery(taskId)));
}

public record TaskAssignmentRequest(int TaskId, int ProjectId);
public record AcceptRecommendationRequest(int TaskId, int UserId, string? Outcome = null);
public record RejectRecommendationRequest(int TaskId, int UserId, string? Reason = null);
