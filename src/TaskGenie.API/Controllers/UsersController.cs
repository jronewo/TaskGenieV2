using MediatR;
using Microsoft.AspNetCore.Mvc;
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

    // Identity endpoints act on the authenticated user only. They used to accept an arbitrary
    // {id}, which let any caller rename, re-avatar or change the password of any account.
    [HttpPut("me/profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
        => Ok(await mediator.Send(new UpdateUserProfileCommand(request.Name, request.Avatar)));

    [HttpPost("me/avatar")]
    public async Task<IActionResult> UploadAvatar(IFormFile file)
    {
        var url = await mediator.Send(new UploadAvatarCommand(file.OpenReadStream(), file.FileName));
        return Ok(new { avatarUrl = url });
    }

    [HttpPost("upload-image")]
    public async Task<IActionResult> UploadImage(IFormFile file, [FromQuery] string folder = "taskgenie/comments")
    {
        var url = await mediator.Send(new UploadImageCommand(file.OpenReadStream(), file.FileName, folder));
        return Ok(new { imageUrl = url });
    }

    [HttpPut("me/change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        await mediator.Send(new ChangePasswordCommand(request.CurrentPassword, request.NewPassword));
        return Ok(new { message = "Password changed successfully. Please sign in again." });
    }
}

public record UpdateProfileRequest(string? Name, string? Avatar);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
