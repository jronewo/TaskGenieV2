using MediatR;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.Application.Features.Notifications.Commands;
using TaskGenie.Application.Features.Notifications.Queries;

namespace TaskGenie.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class NotificationsController(IMediator mediator) : ControllerBase
{
    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserNotifications(int userId)
        => Ok(await mediator.Send(new GetUserNotificationsQuery(userId)));

    [HttpGet("user/{userId}/unread-count")]
    public async Task<IActionResult> GetUnreadCount(int userId)
    {
        var count = await mediator.Send(new GetUnreadCountQuery(userId));
        return Ok(new { count });
    }

    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        await mediator.Send(new MarkNotificationAsReadCommand(id));
        return NoContent();
    }

    [HttpPut("user/{userId}/read-all")]
    public async Task<IActionResult> MarkAllAsRead(int userId)
    {
        await mediator.Send(new MarkAllNotificationsAsReadCommand(userId));
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await mediator.Send(new DeleteNotificationCommand(id));
        return NoContent();
    }
}
