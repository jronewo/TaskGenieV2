using TaskGenie.Domain.Entities;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Application.Interfaces;

/// <summary>
/// Applies the business effect of a Payment that has just been marked Paid (upgrade the org's
/// plan, top up its AI quota, ...). Kept separate from HandlePayOSWebhookCommand so a future
/// second gateway shares exactly one place that decides what a payment "buys". This is only ever
/// called after <see cref="Payment.MarkPaid"/> returns true, so it never needs to worry about
/// double-application itself.
/// </summary>
public interface IPaymentFulfillmentService
{
    Task ApplyAsync(Payment payment, CancellationToken ct = default);
}
