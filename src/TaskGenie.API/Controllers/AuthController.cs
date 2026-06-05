using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.API.Extensions;
using TaskGenie.Application.Features.Auth.Commands;

namespace TaskGenie.API.Controllers;

[Route("api/auth")]
[ApiController]
public class AuthController(IMediator mediator) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        => Ok(await mediator.Send(new RegisterCommand(request.Name, request.Email, request.Password)));

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
        => Ok(await mediator.Send(new LoginCommand(request.Email, request.Password)));

    [AllowAnonymous]
    [HttpPost("google")]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request)
        => Ok(await mediator.Send(new GoogleLoginCommand(request.IdToken)));

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var jti = HttpContext.GetCurrentUserJti();
        if (!string.IsNullOrEmpty(jti))
        {
            var expiresAt = HttpContext.GetTokenExpiration() ?? DateTime.UtcNow.AddHours(1);
            await mediator.Send(new LogoutCommand(jti, expiresAt));
        }

        return Ok(new { message = "Đăng xuất thành công." });
    }
}

public record LoginRequest(string Email, string Password);
public record RegisterRequest(string Name, string Email, string Password);
public record GoogleLoginRequest(string IdToken);
