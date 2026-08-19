using MediatR;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.API.Extensions;
using TaskGenie.Application.Features.Meetings.Commands;
using TaskGenie.Application.Features.Meetings.Queries;

namespace TaskGenie.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class MeetingsController(IMediator mediator) : ControllerBase
{
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
        => Ok(await mediator.Send(new GetMeetingByIdQuery(id)));

    [HttpGet("project/{projectId}")]
    public async Task<IActionResult> GetByProject(int projectId)
        => Ok(await mediator.Send(new GetMeetingsByProjectQuery(projectId)));

    [HttpGet("project/{projectId}/upcoming")]
    public async Task<IActionResult> GetUpcomingByProject(int projectId)
        => Ok(await mediator.Send(new GetUpcomingMeetingsByProjectQuery(projectId)));

    [HttpGet("user")]
    public async Task<IActionResult> GetByUser()
        => Ok(await mediator.Send(new GetMeetingsByUserQuery(HttpContext.GetCurrentUserId())));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateMeetingRequest request)
    {
        var meeting = await mediator.Send(new CreateMeetingCommand(
            request.ProjectId,
            request.Title,
            request.Description,
            request.ScheduledAt,
            request.EndAt,
            request.Location,
            request.AttendeeUserIds ?? []));
        return CreatedAtAction(nameof(GetById), new { id = meeting.MeetingId }, meeting);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateMeetingRequest request)
    {
        await mediator.Send(new UpdateMeetingCommand(
            id,
            request.Title,
            request.Description,
            request.ScheduledAt,
            request.EndAt,
            request.Location,
            request.Status));
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await mediator.Send(new DeleteMeetingCommand(id));
        return NoContent();
    }

    [HttpPost("{id}/attendees")]
    public async Task<IActionResult> AddAttendee(int id, [FromBody] AddAttendeeRequest request)
    {
        await mediator.Send(new AddMeetingAttendeeCommand(id, request.UserId));
        return Ok(new { message = "Attendee added." });
    }

    [HttpDelete("{id}/attendees/{userId}")]
    public async Task<IActionResult> RemoveAttendee(int id, int userId)
    {
        await mediator.Send(new RemoveMeetingAttendeeCommand(id, userId));
        return NoContent();
    }

    [HttpPut("{id}/attendees/status")]
    public async Task<IActionResult> UpdateAttendeeStatus(int id, [FromBody] UpdateAttendeeStatusRequest request)
    {
        await mediator.Send(new UpdateAttendeeStatusCommand(id, request.UserId, request.Status));
        return NoContent();
    }
}

public record CreateMeetingRequest(
    int ProjectId,
    string Title,
    string? Description,
    DateTime ScheduledAt,
    DateTime? EndAt,
    string? Location,
    List<int>? AttendeeUserIds);

public record UpdateMeetingRequest(
    string? Title,
    string? Description,
    DateTime? ScheduledAt,
    DateTime? EndAt,
    string? Location,
    string? Status);

public record AddAttendeeRequest(int UserId);

public record UpdateAttendeeStatusRequest(int UserId, string Status);
