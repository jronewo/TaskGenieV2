using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Application.Features.Payments.Services;

public sealed class PaymentFulfillmentService(
    IOrganizationRepository organizationRepo,
    IUserRepository userRepo
) : IPaymentFulfillmentService
{
    public async Task ApplyAsync(Payment payment, CancellationToken ct = default)
    {
        switch (payment.Purpose)
        {
            case PaymentPurposes.OrganizationUpgrade:
            {
                var org = payment.OrganizationId is { } orgId ? await organizationRepo.GetByIdAsync(orgId, ct) : null;
                if (org is null) return;
                org.UpgradeToPro(PaymentCatalog.ProPeriod);
                await organizationRepo.UpdateAsync(org, ct);
                break;
            }

            case PaymentPurposes.AiQuotaTopUp when payment.PackageCode is not null
                && PaymentCatalog.AiQuotaPackages.TryGetValue(payment.PackageCode, out var pkg):
            {
                var org = payment.OrganizationId is { } orgId ? await organizationRepo.GetByIdAsync(orgId, ct) : null;
                if (org is null) return;
                org.AddAiQuota(pkg.Quota);
                await organizationRepo.UpdateAsync(org, ct);
                break;
            }

            case PaymentPurposes.UserUpgrade when payment.PackageCode is not null
                && PaymentCatalog.ProPlans.TryGetValue(payment.PackageCode, out var plan):
            {
                var user = await userRepo.GetByIdAsync(payment.RequestedByUserId, ct);
                if (user is null) return;
                user.UpgradeToPro(plan.Duration);
                await userRepo.UpdateUserAsync(user, ct);
                break;
            }
        }
    }
}
