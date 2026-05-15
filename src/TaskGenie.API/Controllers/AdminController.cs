using MediatR;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.Application.Features.Admin;

namespace TaskGenie.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AdminController(IMediator mediator) : ControllerBase
{
    [HttpGet("platform-stats")]
    public async Task<IActionResult> GetPlatformStats()
        => Ok(await mediator.Send(new GetPlatformStatsQuery()));
}
