using MediatR;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.Application.Features.Auth.Commands;

namespace TaskGenie.API.Controllers;

[Route("api/auth")]
[ApiController]
public class AuthController(IMediator mediator) : ControllerBase
{
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
        => Ok(await mediator.Send(new LoginCommand(request.Email, request.Password)));

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        => Ok(await mediator.Send(new RegisterCommand(request.Name, request.Email, request.Password)));

    [HttpPost("google")]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request)
        => Ok(await mediator.Send(new GoogleLoginCommand(request.IdToken)));
}

public record LoginRequest(string Email, string Password);
public record RegisterRequest(string Name, string Email, string Password);
public record GoogleLoginRequest(string IdToken);
