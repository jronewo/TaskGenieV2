using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.API.Authorization;
using TaskGenie.Application.Features.ActivityLogs.Queries;

namespace TaskGenie.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ActivityLogsController(IMediator mediator) : ControllerBase
{
    /// <summary>Platform-wide audit trail — administrators only.</summary>
    [Authorize(Policy = AuthorizationPolicies.PlatformAdmin)]
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int limit = 50)
        => Ok(await mediator.Send(new GetAllActivitiesQuery(limit)));

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserActivities(int userId)
        => Ok(await mediator.Send(new GetUserActivitiesQuery(userId)));

    /// <summary>Generic cross-entity audit lookup — administrators only, since the caller's access
    /// to the referenced entity cannot be resolved from an arbitrary (type, id) pair.</summary>
    [Authorize(Policy = AuthorizationPolicies.PlatformAdmin)]
    [HttpGet("entity/{entityType}/{entityId}")]
    public async Task<IActionResult> GetEntityActivities(string entityType, int entityId)
        => Ok(await mediator.Send(new GetEntityActivitiesQuery(entityType, entityId)));

    [HttpGet("project/{projectId}")]
    public async Task<IActionResult> GetProjectActivities(int projectId, [FromQuery] int limit = 50)
        => Ok(await mediator.Send(new GetProjectActivitiesQuery(projectId, limit)));
}
