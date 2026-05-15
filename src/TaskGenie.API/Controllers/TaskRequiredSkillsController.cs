using MediatR;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.Application.Features.Tasks.Commands;
using TaskGenie.Application.Features.Tasks.Queries;

namespace TaskGenie.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class TaskRequiredSkillsController(IMediator mediator) : ControllerBase
{
    [HttpGet("{taskId}")]
    public async Task<IActionResult> GetTaskSkills(int taskId)
        => Ok(await mediator.Send(new GetTaskRequiredSkillsQuery(taskId)));

    [HttpPost("{taskId}")]
    public async Task<IActionResult> UpdateTaskSkills(int taskId, [FromBody] TaskSkillsRequest request)
    {
        await mediator.Send(new ReplaceTaskRequiredSkillsCommand(taskId, request.SkillIds));
        return Ok(new { message = "Task required skills updated successfully." });
    }
}

public record TaskSkillsRequest(List<int> SkillIds);
