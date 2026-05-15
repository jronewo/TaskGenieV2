using MediatR;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.Application.Features.ActivityLogs.Queries;

namespace TaskGenie.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ActivityLogsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int limit = 50)
        => Ok(await mediator.Send(new GetAllActivitiesQuery(limit)));

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserActivities(int userId)
        => Ok(await mediator.Send(new GetUserActivitiesQuery(userId)));

    [HttpGet("entity/{entityType}/{entityId}")]
    public async Task<IActionResult> GetEntityActivities(string entityType, int entityId)
        => Ok(await mediator.Send(new GetEntityActivitiesQuery(entityType, entityId)));

    [HttpGet("project/{projectId}")]
    public async Task<IActionResult> GetProjectActivities(int projectId, [FromQuery] int limit = 50)
        => Ok(await mediator.Send(new GetProjectActivitiesQuery(projectId, limit)));
}
