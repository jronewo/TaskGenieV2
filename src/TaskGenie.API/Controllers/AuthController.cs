using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using TaskGenie.API.Extensions;
using TaskGenie.API.RateLimiting;
using TaskGenie.Application.Features.Auth.Commands;
using TaskGenie.Application.Features.Auth.Queries;

namespace TaskGenie.API.Controllers;

[Route("api/auth")]
[ApiController]
public class AuthController(IMediator mediator) : ControllerBase
{
    [AllowAnonymous]
    [EnableRateLimiting(AuthRateLimitPolicies.Auth)]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        => Ok(await mediator.Send(new RegisterCommand(request.Name, request.Email, request.Password)));

    [AllowAnonymous]
    [EnableRateLimiting(AuthRateLimitPolicies.Auth)]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
        => Ok(await mediator.Send(new LoginCommand(request.Email, request.Password)));

    [AllowAnonymous]
    [EnableRateLimiting(AuthRateLimitPolicies.Auth)]
    [HttpPost("google")]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request)
        => Ok(await mediator.Send(new GoogleLoginCommand(request.IdToken)));

    [AllowAnonymous]
    [EnableRateLimiting(AuthRateLimitPolicies.Auth)]
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request)
        => Ok(await mediator.Send(new RefreshTokenCommand(request.RefreshToken)));

    [HttpGet("me")]
    public async Task<IActionResult> Me()
        => Ok(await mediator.Send(new GetMeQuery()));

    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest? request)
    {
        var jti = HttpContext.GetCurrentUserJti();
        if (!string.IsNullOrEmpty(jti))
        {
            var expiresAt = HttpContext.GetTokenExpiration() ?? DateTime.UtcNow.AddHours(1);
            await mediator.Send(new LogoutCommand(jti, expiresAt, request?.RefreshToken));
        }

        return Ok(new { message = "Đăng xuất thành công." });
    }

    [AllowAnonymous]
    [EnableRateLimiting(AuthRateLimitPolicies.PasswordReset)]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        => Ok(await mediator.Send(new ForgotPasswordCommand(request.Email)));

    [AllowAnonymous]
    [EnableRateLimiting(AuthRateLimitPolicies.PasswordReset)]
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        => Ok(await mediator.Send(new ResetPasswordCommand(request.Token, request.NewPassword)));
}

public record LoginRequest(string Email, string Password);
public record RegisterRequest(string Name, string Email, string Password);
public record GoogleLoginRequest(string IdToken);
public record RefreshTokenRequest(string RefreshToken);
public record LogoutRequest(string? RefreshToken);
public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(string Token, string NewPassword);
