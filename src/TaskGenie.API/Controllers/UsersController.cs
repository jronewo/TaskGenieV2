using MediatR;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.API.Extensions;
using TaskGenie.Application.Features.Users.Commands;
using TaskGenie.Application.Features.Users.Queries;

namespace TaskGenie.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class UsersController(IMediator mediator) : ControllerBase
{
    [HttpGet("search")]
    public async Task<IActionResult> SearchByEmail([FromQuery] string email)
        => Ok(await mediator.Send(new SearchUserByEmailQuery(email)));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
        => Ok(await mediator.Send(new GetUserByIdQuery(id)));

    [HttpPut("{id}/profile")]
    public async Task<IActionResult> UpdateProfile(int id, [FromBody] UpdateProfileRequest request)
    {
        if (id != HttpContext.GetCurrentUserId())
            return Forbid();

        return Ok(await mediator.Send(new UpdateUserProfileCommand(id, request.Name, request.Avatar)));
    }

    [HttpPost("{id}/avatar")]
    public async Task<IActionResult> UploadAvatar(int id, IFormFile file)
    {
        if (id != HttpContext.GetCurrentUserId())
            return Forbid();

        var url = await mediator.Send(new UploadAvatarCommand(id, file.OpenReadStream(), file.FileName));
        return Ok(new { avatarUrl = url });
    }

    [HttpPost("upload-image")]
    public async Task<IActionResult> UploadImage(IFormFile file, [FromQuery] string folder = "taskgenie/comments")
    {
        var url = await mediator.Send(new UploadImageCommand(file.OpenReadStream(), file.FileName, folder));
        return Ok(new { imageUrl = url });
    }

    [HttpPut("{id}/change-password")]
    public async Task<IActionResult> ChangePassword(int id, [FromBody] ChangePasswordRequest request)
    {
        if (id != HttpContext.GetCurrentUserId())
            return Forbid();

        await mediator.Send(new ChangePasswordCommand(id, request.CurrentPassword, request.NewPassword));
        return Ok(new { message = "Password changed successfully." });
    }
}

public record UpdateProfileRequest(string? Name, string? Avatar);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
