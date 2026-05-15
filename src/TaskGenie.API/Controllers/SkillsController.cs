using MediatR;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.Application.Features.Skills.Commands;
using TaskGenie.Application.Features.Skills.Queries;

namespace TaskGenie.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class SkillsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await mediator.Send(new GetAllSkillsQuery()));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
        => Ok(await mediator.Send(new GetSkillByIdQuery(id)));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSkillRequest request)
    {
        var skill = await mediator.Send(new CreateSkillCommand(request.SkillName));
        return CreatedAtAction(nameof(GetById), new { id = skill.SkillId }, skill);
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserSkills(int userId)
        => Ok(await mediator.Send(new GetUserSkillsQuery(userId)));

    [HttpPost("user")]
    public async Task<IActionResult> AddUserSkill([FromBody] AddUserSkillRequest request)
    {
        await mediator.Send(new AddUserSkillCommand(request.UserId, request.SkillId, request.Level));
        return Ok(new { message = "Skill added to user profile." });
    }

    [HttpPut("user/{userSkillId}")]
    public async Task<IActionResult> UpdateSkillLevel(int userSkillId, [FromBody] int level)
    {
        await mediator.Send(new UpdateUserSkillLevelCommand(userSkillId, level));
        return NoContent();
    }

    [HttpDelete("user/{userSkillId}")]
    public async Task<IActionResult> RemoveUserSkill(int userSkillId)
    {
        await mediator.Send(new RemoveUserSkillCommand(userSkillId));
        return NoContent();
    }
}

public record CreateSkillRequest(string SkillName);
public record AddUserSkillRequest(int UserId, int SkillId, int Level);
