using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.API.Authorization;
using TaskGenie.API.Extensions;
using TaskGenie.Application.Features.Skills.Commands;
using TaskGenie.Application.Features.Skills.Queries;

namespace TaskGenie.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class SkillsController(IMediator mediator) : ControllerBase
{
    // ---- General catalog (any authenticated user — needed for self-service skill pickers,
    // task-required-skill assignment, etc). Deactivated skills are hidden here automatically. ----

    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await mediator.Send(new GetAllSkillsQuery()));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
        => Ok(await mediator.Send(new GetSkillByIdQuery(id)));

    // ---- Admin catalog management ----

    [HttpGet("admin")]
    [Authorize(Policy = AuthorizationPolicies.PlatformAdmin)]
    public async Task<IActionResult> GetAdminSkills(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? search = null, [FromQuery] bool? activeOnly = null)
        => Ok(await mediator.Send(new GetAdminSkillsQuery(page, pageSize, search, activeOnly)));

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.PlatformAdmin)]
    public async Task<IActionResult> Create([FromBody] CreateSkillRequest request)
    {
        var skill = await mediator.Send(new CreateSkillCommand(request.SkillName));
        return CreatedAtAction(nameof(GetById), new { id = skill.SkillId }, skill);
    }

    [HttpPut("{id}")]
    [Authorize(Policy = AuthorizationPolicies.PlatformAdmin)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateSkillRequest request)
        => Ok(await mediator.Send(new UpdateSkillCommand(id, request.SkillName)));

    [HttpPut("{id}/active")]
    [Authorize(Policy = AuthorizationPolicies.PlatformAdmin)]
    public async Task<IActionResult> SetActive(int id, [FromBody] SetSkillActiveRequest request)
        => Ok(await mediator.Send(new SetSkillActiveCommand(id, request.IsActive)));

    // ---- Self-service user skills (own profile only; UserId is always resolved from the
    // JWT for mutations — never accepted from the client) ----

    [HttpGet("me")]
    public async Task<IActionResult> GetMySkills()
        => Ok(await mediator.Send(new GetUserSkillsQuery(HttpContext.GetCurrentUserId())));

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserSkills(int userId)
        => Ok(await mediator.Send(new GetUserSkillsQuery(userId)));

    [HttpPost("user")]
    public async Task<IActionResult> AddUserSkill([FromBody] AddUserSkillRequest request)
    {
        await mediator.Send(new AddUserSkillCommand(request.SkillId, request.Level));
        return Ok(new { message = "Skill added to your profile." });
    }

    [HttpPut("user/{userSkillId}")]
    public async Task<IActionResult> UpdateSkillLevel(int userSkillId, [FromBody] UpdateUserSkillLevelRequest request)
    {
        await mediator.Send(new UpdateUserSkillLevelCommand(userSkillId, request.Level));
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
public record UpdateSkillRequest(string SkillName);
public record SetSkillActiveRequest(bool IsActive);
public record AddUserSkillRequest(int SkillId, int Level);
public record UpdateUserSkillLevelRequest(int Level);
