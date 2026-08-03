using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Common.Options;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Infrastructure.ExternalServices.PayOs;

namespace TaskGenie.API.Controllers;

/// <summary>
/// The seam PayOS plugs into. A payment is only ever settled from here — never from the buyer's
/// return-URL redirect, which is not authenticated and can be replayed or skipped by the client — so
/// <see cref="IBillingService.SettlePaymentAsync"/> is the single source of truth for "did this
/// actually get paid".
///
/// Unauthenticated in the JWT sense (PayOS has no user session) and instead gated on the HMAC-SHA256
/// signature PayOS computes over the `data` payload with the merchant's checksum key. If PayOS is not
/// configured the route answers 404, so an unconfigured deployment can never expose a way to mark
/// payments as paid.
/// </summary>
[ApiController]
[Route("api/webhooks/payos")]
[AllowAnonymous]
public sealed class PayOsWebhookController(
    IBillingService billing,
    IOptions<PayOsOptions> options,
    ILogger<PayOsWebhookController> logger) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Receive([FromBody] JsonElement body, CancellationToken ct)
    {
        var payOsOptions = options.Value;
        if (!payOsOptions.IsConfigured)
            return NotFound();

        if (!body.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Object)
            return BadRequest(new { message = "Missing data payload." });

        if (!body.TryGetProperty("signature", out var signatureProp) || signatureProp.ValueKind != JsonValueKind.String)
            return Unauthorized(new { message = "Missing signature." });

        var providedSignature = signatureProp.GetString() ?? string.Empty;
        var fields = PayOsSignature.ToSignableFields(data);
        var computedSignature = PayOsSignature.Sign(fields, payOsOptions.ChecksumKey);

        if (!PayOsSignature.Matches(computedSignature, providedSignature))
        {
            logger.LogWarning("Rejected PayOS webhook: signature mismatch.");
            return Unauthorized(new { message = "Invalid webhook signature." });
        }

        if (!data.TryGetProperty("orderCode", out var orderCodeProp) || !orderCodeProp.TryGetInt32(out var paymentTransactionId))
            return BadRequest(new { message = "orderCode missing or not a valid payment id." });

        // PayOS's own webhook-registration ping reuses this same shape with a synthetic orderCode
        // that never corresponds to a real transaction — acknowledge it without touching billing.
        var success = body.TryGetProperty("success", out var successProp) && successProp.ValueKind == JsonValueKind.True;
        var dataCode = data.TryGetProperty("code", out var dataCodeProp) ? dataCodeProp.GetString() : null;
        var status = success && dataCode == "00" ? PaymentStatuses.Succeeded : PaymentStatuses.Failed;

        try
        {
            var payment = await billing.SettlePaymentAsync(paymentTransactionId, status, ct);
            return Ok(new { payment.PaymentTransactionId, payment.Status });
        }
        catch (NotFoundException)
        {
            // Registration test callback or a stale orderCode — nothing to settle, but not a signature
            // problem, so acknowledge with 200 rather than making PayOS retry forever.
            logger.LogInformation("PayOS webhook referenced unknown payment {OrderCode}; acknowledging without action.", paymentTransactionId);
            return Ok(new { message = "Acknowledged." });
        }
    }
}
