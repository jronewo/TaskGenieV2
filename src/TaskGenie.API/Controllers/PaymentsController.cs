using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.API.Extensions;
using TaskGenie.Application.Features.Payments.Commands;
using TaskGenie.Application.Features.Payments.Queries;

namespace TaskGenie.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class PaymentsController(IMediator mediator) : ControllerBase
{
    /// <summary>Starts a payOS payment to upgrade an organization from Free to Pro.</summary>
    [HttpPost("organizations/{orgId}/upgrade")]
    public async Task<IActionResult> CreateUpgradePayment(int orgId, [FromBody] CreateUpgradePaymentRequest request)
    {
        var userId = HttpContext.GetCurrentUserId();
        var result = await mediator.Send(new CreateOrganizationUpgradePaymentCommand(
            orgId, userId, request.ReturnUrl, request.CancelUrl));
        return Ok(result);
    }

    /// <summary>Starts a payOS payment to top up an organization's AI usage quota.</summary>
    [HttpPost("organizations/{orgId}/ai-topup")]
    public async Task<IActionResult> CreateAiQuotaTopUpPayment(int orgId, [FromBody] CreateAiTopUpPaymentRequest request)
    {
        var userId = HttpContext.GetCurrentUserId();
        var result = await mediator.Send(new CreateAiQuotaTopUpPaymentCommand(
            orgId, userId, request.PackageCode, request.ReturnUrl, request.CancelUrl));
        return Ok(result);
    }

    /// <summary>Starts a payOS payment for a user buying their own Pro plan, independent of any Organization.</summary>
    [HttpPost("upgrade")]
    public async Task<IActionResult> CreateUserUpgradePayment([FromBody] CreateUserUpgradePaymentRequest request)
    {
        var userId = HttpContext.GetCurrentUserId();
        var result = await mediator.Send(new CreateUserUpgradePaymentCommand(
            userId, request.PackageCode, request.ReturnUrl, request.CancelUrl));
        return Ok(result);
    }

    /// <summary>
    /// Polled by the frontend after the user is redirected back from payOS, since the return-URL
    /// redirect itself is never treated as proof of payment — only the webhook is.
    /// </summary>
    [HttpGet("{orderCode:long}/status")]
    public async Task<IActionResult> GetStatus(long orderCode)
    {
        var payment = await mediator.Send(new GetPaymentStatusQuery(orderCode));
        return payment is null ? NotFound() : Ok(payment);
    }

    [HttpGet("organizations/{orgId}")]
    public async Task<IActionResult> GetOrganizationPayments(int orgId)
        => Ok(await mediator.Send(new GetOrganizationPaymentsQuery(orgId)));

    /// <summary>
    /// payOS server-to-server callback. Anonymous because payOS never sends our JWT; the request
    /// is authenticated instead by verifying the payload's HMAC signature inside the handler.
    /// </summary>
    [HttpPost("webhook/payos")]
    [AllowAnonymous]
    public async Task<IActionResult> PayOSWebhook()
    {
        using var reader = new StreamReader(Request.Body);
        var rawBody = await reader.ReadToEndAsync();

        var accepted = await mediator.Send(new HandlePayOSWebhookCommand(rawBody));
        return accepted ? Ok(new { success = true }) : BadRequest(new { success = false });
    }
}

public record CreateUpgradePaymentRequest(string ReturnUrl, string CancelUrl);
public record CreateAiTopUpPaymentRequest(string PackageCode, string ReturnUrl, string CancelUrl);
public record CreateUserUpgradePaymentRequest(string PackageCode, string ReturnUrl, string CancelUrl);
