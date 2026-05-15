using MediatR;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.Application.Features.Invitations.Commands;
using TaskGenie.Application.Features.Invitations.Queries;

namespace TaskGenie.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class InvitationsController(IMediator mediator) : ControllerBase
{
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
        => Ok(await mediator.Send(new GetInvitationByIdQuery(id)));

    [HttpGet("team/{teamId}")]
    public async Task<IActionResult> GetTeamInvitations(int teamId)
        => Ok(await mediator.Send(new GetTeamInvitationsQuery(teamId)));

    [HttpGet("user/{email}")]
    public async Task<IActionResult> GetUserInvitations(string email)
        => Ok(await mediator.Send(new GetUserInvitationsQuery(email)));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateInvitationRequest request)
    {
        var invitation = await mediator.Send(new CreateInvitationCommand(request.TeamId, request.Email));
        return CreatedAtAction(nameof(GetById), new { id = invitation.InvitationId }, invitation);
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateInvitationStatusRequest request)
    {
        await mediator.Send(new UpdateInvitationStatusCommand(id, request.Status));
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await mediator.Send(new DeleteInvitationCommand(id));
        return NoContent();
    }
}

public record CreateInvitationRequest(int TeamId, string Email);
public record UpdateInvitationStatusRequest(string Status);
