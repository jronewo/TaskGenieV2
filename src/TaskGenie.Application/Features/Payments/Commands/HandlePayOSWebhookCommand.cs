using MediatR;
using Microsoft.Extensions.Logging;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Payments.Commands;

/// <summary>
/// Handles an inbound payOS webhook call. Returns false when the request should be rejected
/// (bad signature / unknown order / amount mismatch) so the controller can answer with a
/// non-2xx status; payOS will retry on non-2xx.
/// </summary>
public sealed record HandlePayOSWebhookCommand(string RawBody) : IRequest<bool>;

public sealed class HandlePayOSWebhookCommandHandler(
    IPayOSService payOSService,
    IPaymentRepository paymentRepo,
    IPaymentFulfillmentService fulfillmentService,
    ILogger<HandlePayOSWebhookCommandHandler> logger
) : IRequestHandler<HandlePayOSWebhookCommand, bool>
{
    public async Task<bool> Handle(HandlePayOSWebhookCommand request, CancellationToken ct)
    {
        var data = payOSService.VerifyAndParseWebhook(request.RawBody);
        if (data is null)
        {
            logger.LogWarning("Rejected payOS webhook: invalid signature.");
            return false;
        }

        var payment = await paymentRepo.GetByOrderCodeAsync(data.OrderCode, ct);
        if (payment is null)
        {
            logger.LogWarning("payOS webhook for unknown orderCode {OrderCode}", data.OrderCode);
            return false;
        }

        // "00" is payOS's success code; anything else means failed/cancelled at the gateway.
        if (data.Code != "00")
        {
            payment.MarkFailed(request.RawBody);
            await paymentRepo.UpdateAsync(payment, ct);
            return true;
        }

        // Defense in depth: never trust the webhook amount blindly, it must match the amount we
        // quoted when the payment link was created.
        if (data.Amount != payment.Amount)
        {
            logger.LogError(
                "payOS webhook amount mismatch for order {OrderCode}: expected {Expected}, got {Actual}",
                data.OrderCode, payment.Amount, data.Amount);
            return false;
        }

        // MarkPaid is idempotent — a retried webhook for an already-Paid payment applies nothing twice.
        var justPaid = payment.MarkPaid(data.Reference, request.RawBody);
        await paymentRepo.UpdateAsync(payment, ct);

        if (justPaid)
            await fulfillmentService.ApplyAsync(payment, ct);

        return true;
    }
}
