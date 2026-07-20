using MediatR;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.API.Extensions;
using TaskGenie.Application.Features.Teams.Commands;
using TaskGenie.Application.Features.Teams.Queries;

namespace TaskGenie.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class TeamsController(IMediator mediator) : ControllerBase
{
    [HttpGet("my")]
    public async Task<IActionResult> GetMyTeams()
        => Ok(await mediator.Send(new GetMyTeamsQuery(HttpContext.GetCurrentUserId())));

    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await mediator.Send(new GetAllTeamsQuery()));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
        => Ok(await mediator.Send(new GetTeamByIdQuery(id)));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTeamRequest request)
    {
        var team = await mediator.Send(new CreateTeamCommand(
            request.Name,
            request.Description,
            request.CreatedBy));
        return CreatedAtAction(nameof(GetById), new { id = team.TeamId }, team);
    }

    [HttpPost("{id}/members")]
    public async Task<IActionResult> AddMember(int id, [FromBody] AddTeamMemberRequest request)
    {
        await mediator.Send(new AddTeamMemberCommand(id, request.UserId, request.Role));
        return Ok(new { message = "Member added to team." });
    }

    [HttpDelete("members/{memberId}")]
    public async Task<IActionResult> RemoveMember(int memberId)
    {
        await mediator.Send(new RemoveTeamMemberCommand(memberId));
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await mediator.Send(new DeleteTeamCommand(id));
        return NoContent();
    }
}

public record CreateTeamRequest(string Name, string? Description, int CreatedBy);
public record AddTeamMemberRequest(int UserId, string Role);
