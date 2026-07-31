using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Application.Features.Payments.Services;

public sealed class PaymentFulfillmentService(IOrganizationRepository organizationRepo) : IPaymentFulfillmentService
{
    public async Task ApplyAsync(Payment payment, CancellationToken ct = default)
    {
        var org = await organizationRepo.GetByIdAsync(payment.OrganizationId, ct);
        if (org is null) return;

        switch (payment.Purpose)
        {
            case PaymentPurposes.OrganizationUpgrade:
                org.UpgradeToPro(PaymentCatalog.ProPeriod);
                await organizationRepo.UpdateAsync(org, ct);
                break;

            case PaymentPurposes.AiQuotaTopUp when payment.PackageCode is not null
                && PaymentCatalog.AiQuotaPackages.TryGetValue(payment.PackageCode, out var pkg):
                org.AddAiQuota(pkg.Quota);
                await organizationRepo.UpdateAsync(org, ct);
                break;
        }
    }
}
