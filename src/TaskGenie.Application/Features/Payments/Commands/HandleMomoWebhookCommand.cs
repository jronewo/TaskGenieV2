using MediatR;
using Microsoft.Extensions.Logging;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Payments.Commands;

/// <summary>Handles an inbound MoMo IPN call. See HandlePayOSWebhookCommand for the equivalent payOS flow.</summary>
public sealed record HandleMomoWebhookCommand(MomoIpnPayload Payload) : IRequest<bool>;

public sealed class HandleMomoWebhookCommandHandler(
    IMomoService momoService,
    IPaymentRepository paymentRepo,
    IPaymentFulfillmentService fulfillmentService,
    ILogger<HandleMomoWebhookCommandHandler> logger
) : IRequestHandler<HandleMomoWebhookCommand, bool>
{
    public async Task<bool> Handle(HandleMomoWebhookCommand request, CancellationToken ct)
    {
        var payload = request.Payload;

        if (!momoService.VerifyIpnSignature(payload))
        {
            logger.LogWarning("Rejected MoMo IPN: invalid signature for orderId {OrderId}", payload.OrderId);
            return false;
        }

        if (!long.TryParse(payload.OrderId, out var orderCode))
        {
            logger.LogWarning("MoMo IPN with non-numeric orderId {OrderId}", payload.OrderId);
            return false;
        }

        var payment = await paymentRepo.GetByOrderCodeAsync(orderCode, ct);
        if (payment is null)
        {
            logger.LogWarning("MoMo IPN for unknown orderId {OrderId}", payload.OrderId);
            return false;
        }

        var rawPayload = System.Text.Json.JsonSerializer.Serialize(payload);

        // resultCode 0 = success. Anything else = failed/cancelled at the gateway.
        if (payload.ResultCode != 0)
        {
            payment.MarkFailed(rawPayload);
            await paymentRepo.UpdateAsync(payment, ct);
            return true;
        }

        if (payload.Amount != payment.Amount)
        {
            logger.LogError(
                "MoMo IPN amount mismatch for orderId {OrderId}: expected {Expected}, got {Actual}",
                payload.OrderId, payment.Amount, payload.Amount);
            return false;
        }

        var justPaid = payment.MarkPaid(payload.TransId.ToString(), rawPayload);
        await paymentRepo.UpdateAsync(payment, ct);

        if (justPaid)
            await fulfillmentService.ApplyAsync(payment, ct);

        return true;
    }
}
