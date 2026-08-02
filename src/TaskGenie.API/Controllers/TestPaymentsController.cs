using Microsoft.AspNetCore.Mvc;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;

namespace TaskGenie.API.Controllers;

/// <summary>Test-only settlement driver standing in for a real gateway callback. Every route
/// returns 404 outside Development/UAT/Testing, so the simulated flow simply does not exist in
/// Production. The work itself is done by the production <see cref="IBillingService"/> path.</summary>
[Route("api/test-payments")]
[ApiController]
public class TestPaymentsController(
    IBillingService billing,
    IPaymentProvider paymentProvider,
    IHostEnvironment environment) : ControllerBase
{
    private bool SimulationAllowed =>
        paymentProvider.IsTestProvider
        && (environment.IsDevelopment()
            || environment.IsEnvironment("UAT")
            || environment.IsEnvironment("Testing")
            || environment.IsEnvironment("RateLimitTesting"));

    [HttpPost("{paymentId}/simulate")]
    public async Task<IActionResult> Simulate(int paymentId, [FromBody] SimulatePaymentRequest request)
    {
        if (!SimulationAllowed) return NotFound();

        var status = request.Status?.ToUpperInvariant() ?? string.Empty;
        if (!PaymentStatuses.IsSimulatable(status))
            return BadRequest(new
            {
                message = $"status must be one of {string.Join(", ", PaymentStatuses.Simulatable)}."
            });

        var payment = await billing.SettlePaymentAsync(paymentId, status);
        return Ok(PaymentResponse.From(payment));
    }
}

public record SimulatePaymentRequest(string Status);
