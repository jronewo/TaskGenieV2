using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.API.Authorization;
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

    [Authorize(Policy = AuthorizationPolicies.PlatformAdmin)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSkillRequest request)
    {
        var skill = await mediator.Send(new CreateSkillCommand(request.SkillName));
        return CreatedAtAction(nameof(GetById), new { id = skill.SkillId }, skill);
    }

    /// <summary>Full catalog including archived skills — administrators only.</summary>
    [Authorize(Policy = AuthorizationPolicies.PlatformAdmin)]
    [HttpGet("admin")]
    public async Task<IActionResult> GetAdminCatalog([FromQuery] string? search, [FromQuery] bool? isActive)
        => Ok(await mediator.Send(new AdminListSkillsQuery(search, isActive)));

    [Authorize(Policy = AuthorizationPolicies.PlatformAdmin)]
    [HttpPut("{id}")]
    public async Task<IActionResult> Rename(int id, [FromBody] RenameSkillRequest request)
        => Ok(await mediator.Send(new UpdateSkillCommand(id, request.SkillName)));

    /// <summary>Archive or restore a skill. Skills are never hard-deleted because tasks and user
    /// profiles keep referencing them.</summary>
    [Authorize(Policy = AuthorizationPolicies.PlatformAdmin)]
    [HttpPut("{id}/active")]
    public async Task<IActionResult> SetActive(int id, [FromBody] SetSkillActiveRequest request)
        => Ok(await mediator.Send(new SetSkillActiveCommand(id, request.IsActive)));

    [HttpGet("me")]
    public async Task<IActionResult> GetMySkills()
        => Ok(await mediator.Send(new GetMySkillsQuery()));

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserSkills(int userId)
        => Ok(await mediator.Send(new GetUserSkillsQuery(userId)));

    [HttpPost("user")]
    public async Task<IActionResult> AddUserSkill([FromBody] AddUserSkillRequest request)
    {
        await mediator.Send(new AddUserSkillCommand(request.SkillId, request.Level));
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
public record AddUserSkillRequest(int SkillId, int Level);
public record RenameSkillRequest(string SkillName);
public record SetSkillActiveRequest(bool IsActive);
