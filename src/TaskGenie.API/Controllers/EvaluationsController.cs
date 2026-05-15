using MediatR;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.Application.Features.Evaluations.Commands;
using TaskGenie.Application.Features.Evaluations.Queries;

namespace TaskGenie.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class EvaluationsController(IMediator mediator) : ControllerBase
{
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
        => Ok(await mediator.Send(new GetEvaluationByIdQuery(id)));

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserEvaluations(int userId)
        => Ok(await mediator.Send(new GetUserEvaluationsQuery(userId)));

    [HttpGet("leader/{leaderId}")]
    public async Task<IActionResult> GetLeaderEvaluations(int leaderId)
        => Ok(await mediator.Send(new GetLeaderEvaluationsQuery(leaderId)));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateEvaluationRequest request)
    {
        var evaluation = await mediator.Send(new CreateEvaluationCommand(
            request.UserId,
            request.LeaderId,
            request.SkillScore,
            request.TeamworkScore,
            request.DeadlineScore,
            request.CommunicationScore));
        return CreatedAtAction(nameof(GetById), new { id = evaluation.EvaluationId }, evaluation);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await mediator.Send(new DeleteEvaluationCommand(id));
        return NoContent();
    }
}

public record CreateEvaluationRequest(
    int UserId,
    int LeaderId,
    int? SkillScore,
    int? TeamworkScore,
    int? DeadlineScore,
    int? CommunicationScore);
