using MediatR;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.API.Middleware;
using TaskGenie.Application.Features.Projects.Commands;
using TaskGenie.Application.Features.Projects.Queries;
using TaskGenie.Application.Features.Projects.DTOs;

namespace TaskGenie.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ProjectsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await mediator.Send(new GetProjectsByUserQuery(HttpContext.GetCurrentUserId())));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
        => Ok(await mediator.Send(new GetProjectByIdQuery(id)));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProjectRequest request)
    {
        var project = await mediator.Send(new CreateProjectCommand(
            request.Name,
            request.Description,
            request.CreatedBy,
            request.OrganizationId,
            request.Deadline));
        return CreatedAtAction(nameof(GetById), new { id = project.ProjectId }, project);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateProjectRequest request)
    {
        await mediator.Send(new UpdateProjectCommand(
            id,
            request.Name,
            request.Description,
            request.Status,
            request.TeamId,
            request.Deadline));
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await mediator.Send(new DeleteProjectCommand(id));
        return NoContent();
    }

    [HttpPost("{id}/members")]
    public async Task<IActionResult> AddMember(int id, [FromBody] AddProjectMemberRequest request)
    {
        await mediator.Send(new AddProjectMemberCommand(id, request.Email, request.Role));
        return Ok(new { message = "Member added to project." });
    }

    /// <summary>Xem trước tổng kết dự án (không đóng, không tính điểm).</summary>
    [HttpGet("{id}/summary")]
    public async Task<IActionResult> GetSummary(int id)
        => Ok(await mediator.Send(new GetProjectSummaryQuery(id)));

    /// <summary>Tổng kết và đóng dự án. Tự động tính + lưu điểm cho tất cả thành viên.</summary>
    [HttpPost("{id}/close")]
    public async Task<IActionResult> Close(int id)
        => Ok(await mediator.Send(new CloseProjectCommand(id)));
}

public record CreateProjectRequest(
    string Name,
    string? Description,
    int CreatedBy,
    int? OrganizationId,
    DateOnly? Deadline);

public record UpdateProjectRequest(
    string? Name,
    string? Description,
    string? Status,
    int? TeamId,
    DateOnly? Deadline);

public record AddProjectMemberRequest(string Email, string Role);
