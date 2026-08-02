using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;

namespace TaskGenie.API.Controllers;

/// <summary>
/// The seam a real payment gateway plugs into.
///
/// Everything downstream of a settled payment — the subscription, the entitlement, the plan a user
/// sees — already works and is driven by <see cref="IBillingService.SettlePaymentAsync"/>. The only
/// thing a gateway integration has to do is call this endpoint when it confirms (or rejects) a
/// charge. Nothing else in the codebase needs to change.
///
/// It is deliberately unauthenticated in the JWT sense — a gateway has no user session — and is
/// instead gated on a shared secret. If no secret is configured the route answers 404, so an
/// unconfigured deployment can never expose a way to mark payments as paid.
/// </summary>
[ApiController]
[Route("api/payment-webhook")]
[AllowAnonymous]
public sealed class PaymentWebhookController(
    IBillingService billing,
    IConfiguration configuration,
    ILogger<PaymentWebhookController> logger) : ControllerBase
{
    /// <summary>Header the gateway must send. Configure `Payments:WebhookSecret` to enable this.</summary>
    public const string SignatureHeader = "X-Payment-Signature";

    [HttpPost("settle")]
    public async Task<IActionResult> Settle([FromBody] PaymentWebhookRequest request, CancellationToken ct)
    {
        var expected = configuration["Payments:WebhookSecret"];
        if (string.IsNullOrWhiteSpace(expected))
        {
            // Not configured means not in use: behave as though the route does not exist.
            return NotFound();
        }

        if (!Request.Headers.TryGetValue(SignatureHeader, out var provided)
            || !CryptographicEquals(provided.ToString(), expected))
        {
            logger.LogWarning("Rejected payment webhook for {PaymentId}: bad or missing signature.",
                request.PaymentId);
            return Unauthorized(new { message = "Invalid webhook signature." });
        }

        var status = request.Status?.ToUpperInvariant() ?? string.Empty;
        if (!PaymentStatuses.Simulatable.Contains(status))
        {
            return BadRequest(new
            {
                message = $"status must be one of {string.Join(", ", PaymentStatuses.Simulatable)}."
            });
        }

        // Settling is idempotent: a gateway that retries must not create a second subscription.
        var payment = await billing.SettlePaymentAsync(request.PaymentId, status, ct);

        return Ok(new { payment.PaymentTransactionId, payment.Status });
    }

    /// <summary>Length-independent comparison, so a wrong secret cannot be guessed from timing.</summary>
    private static bool CryptographicEquals(string a, string b)
    {
        var left = System.Text.Encoding.UTF8.GetBytes(a);
        var right = System.Text.Encoding.UTF8.GetBytes(b);
        return System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(
            System.Security.Cryptography.SHA256.HashData(left),
            System.Security.Cryptography.SHA256.HashData(right));
    }
}

/// <summary>What a gateway posts back once it has a verdict on a charge.</summary>
public record PaymentWebhookRequest(int PaymentId, string? Status, string? ProviderReference = null);
