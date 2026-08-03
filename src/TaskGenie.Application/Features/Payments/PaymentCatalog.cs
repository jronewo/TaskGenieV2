namespace TaskGenie.Application.Features.Payments;

/// <summary>
/// Pricing table for paid features. All prices are placeholders in VND — adjust to your actual
/// business numbers before going live. Keeping prices here (server-side) rather than trusting a
/// client-supplied amount is deliberate: a payment's amount is always looked up from this catalog,
/// never taken from the request.
/// </summary>
public static class PaymentCatalog
{
    public const long ProMonthlyPriceVnd = 199_000;
    public static readonly TimeSpan ProPeriod = TimeSpan.FromDays(30);

    public static readonly IReadOnlyDictionary<string, (int Quota, long PriceVnd)> AiQuotaPackages =
        new Dictionary<string, (int Quota, long PriceVnd)>
        {
            ["AI_QUOTA_50"] = (50, 29_000),
            ["AI_QUOTA_200"] = (200, 99_000),
            ["AI_QUOTA_500"] = (500, 199_000)
        };

    /// <summary>Personal Pro plans a user can buy directly, independent of any Organization they
    /// own — see CreateUserUpgradePaymentCommand. Yearly is priced below 12x monthly on purpose.</summary>
    public static readonly IReadOnlyDictionary<string, (TimeSpan Duration, long PriceVnd)> ProPlans =
        new Dictionary<string, (TimeSpan Duration, long PriceVnd)>
        {
            ["PRO_MONTHLY"] = (TimeSpan.FromDays(30), 99_000),
            ["PRO_YEARLY"] = (TimeSpan.FromDays(365), 999_000)
        };
}
