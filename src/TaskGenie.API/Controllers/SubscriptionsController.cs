using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.Application.Features.Subscriptions.Commands;
using TaskGenie.Application.Features.Subscriptions.Queries;

namespace TaskGenie.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class SubscriptionsController(IMediator mediator) : ControllerBase
{
    [HttpGet("plans")]
    public async Task<IActionResult> GetPlans([FromQuery] string? scope)
        => Ok(await mediator.Send(new GetActivePlansQuery(scope)));

    [HttpGet("me")]
    public async Task<IActionResult> GetMySubscription([FromQuery] int? organizationId)
        => Ok(await mediator.Send(new GetMySubscriptionQuery(organizationId)));

    [HttpGet("payments")]
    public async Task<IActionResult> GetPaymentHistory([FromQuery] int? organizationId)
        => Ok(await mediator.Send(new GetPaymentHistoryQuery(organizationId)));

    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe([FromBody] SubscribeRequest request)
        => Ok(await mediator.Send(new SubscribeCommand(request.PlanId, request.OrganizationId)));

    [HttpPost("payments/{paymentTransactionId}/confirm")]
    public async Task<IActionResult> ConfirmPayment(int paymentTransactionId, [FromBody] ConfirmPaymentRequest request)
        => Ok(await mediator.Send(new ConfirmPaymentCommand(paymentTransactionId, request.Success)));

    [HttpPost("cancel")]
    public async Task<IActionResult> Cancel([FromBody] CancelSubscriptionRequest request)
    {
        await mediator.Send(new CancelSubscriptionCommand(request.OrganizationId));
        return Ok(new { message = "Subscription canceled." });
    }
}

public record SubscribeRequest(int PlanId, int? OrganizationId);
public record ConfirmPaymentRequest(bool Success);
public record CancelSubscriptionRequest(int? OrganizationId);
