using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Application.Features.Admin;

// ── Plan catalog administration ──────────────────────────────────────────────────────

public sealed record AdminPlanDto(
    int PlanId, string Code, string Name, string Audience, string BillingInterval,
    int PriceMinor, string Currency, int? ProjectLimit, int? MemberLimit, bool IsActive, int SortOrder,
    bool AiChatbotEnabled, int? DurationDays, int EffectiveDurationDays)
{
    public static AdminPlanDto From(Plan p) => new(
        p.PlanId, p.Code, p.Name, p.Audience, p.BillingInterval,
        p.PriceMinor, p.Currency, p.ProjectLimit, p.MemberLimit, p.IsActive, p.SortOrder,
        p.AiChatbotEnabled, p.DurationDays, p.EffectiveDurationDays);
}

public sealed record AdminListPlansQuery : IRequest<List<AdminPlanDto>>;

public sealed class AdminListPlansQueryHandler(IPlanRepository planRepo)
    : IRequestHandler<AdminListPlansQuery, List<AdminPlanDto>>
{
    public async Task<List<AdminPlanDto>> Handle(AdminListPlansQuery query, CancellationToken ct)
    {
        // Admins see archived plans too, so they can reactivate them.
        var plans = await planRepo.GetAllAsync(activeOnly: false, audience: null, ct);
        return plans.Select(AdminPlanDto.From).ToList();
    }
}

/// <summary>A null limit means unlimited; a null <paramref name="DurationDays"/> falls back to the
/// billing interval.</summary>
public sealed record AdminCreatePlanCommand(
    string Code, string Name, string Audience, string BillingInterval,
    int PriceMinor, string Currency, int? ProjectLimit, int? MemberLimit, int SortOrder,
    bool AiChatbotEnabled = false, int? DurationDays = null) : IRequest<AdminPlanDto>;

public sealed class AdminCreatePlanCommandHandler(IPlanRepository planRepo)
    : IRequestHandler<AdminCreatePlanCommand, AdminPlanDto>
{
    public async Task<AdminPlanDto> Handle(AdminCreatePlanCommand cmd, CancellationToken ct)
    {
        if (!PlanAudiences.IsValid(cmd.Audience))
            throw new InvalidOperationException("Audience must be PERSONAL or ORGANIZATION.");
        if (!PlanBillingIntervals.IsValid(cmd.BillingInterval))
            throw new InvalidOperationException("BillingInterval must be NONE, MONTHLY or YEARLY.");
        if (cmd.PriceMinor < 0)
            throw new InvalidOperationException("Price cannot be negative.");
        if (cmd.ProjectLimit is < 0)
            throw new InvalidOperationException("Project limit cannot be negative.");
        if (cmd.DurationDays is < 1)
            throw new InvalidOperationException("Plan duration must be at least one day.");

        var code = cmd.Code.Trim().ToUpperInvariant();
        if (await planRepo.GetByCodeAsync(code, ct) is not null)
            throw new InvalidOperationException($"A plan with code '{code}' already exists.");

        var plan = Plan.Create(code, cmd.Name, cmd.Audience, cmd.BillingInterval,
            cmd.PriceMinor, cmd.Currency, cmd.ProjectLimit, cmd.MemberLimit, cmd.SortOrder,
            cmd.AiChatbotEnabled, cmd.DurationDays);
        await planRepo.AddAsync(plan, ct);
        return AdminPlanDto.From(plan);
    }
}

/// <summary>
/// A whole-form update: every field is sent, and a null limit means unlimited rather than
/// "unchanged". That distinction is why the admin UI can switch a plan to unlimited projects at all.
/// </summary>
public sealed record AdminUpdatePlanCommand(
    int PlanId, string Name, int PriceMinor, int? ProjectLimit, int? MemberLimit, int SortOrder,
    bool AiChatbotEnabled, int? DurationDays)
    : IRequest<AdminPlanDto>;

public sealed class AdminUpdatePlanCommandHandler(IPlanRepository planRepo)
    : IRequestHandler<AdminUpdatePlanCommand, AdminPlanDto>
{
    public async Task<AdminPlanDto> Handle(AdminUpdatePlanCommand cmd, CancellationToken ct)
    {
        var plan = await planRepo.GetByIdAsync(cmd.PlanId, ct)
            ?? throw new NotFoundException("Plan", cmd.PlanId);

        if (cmd.PriceMinor < 0)
            throw new InvalidOperationException("Price cannot be negative.");
        if (cmd.ProjectLimit is < 0)
            throw new InvalidOperationException("Project limit cannot be negative.");
        if (cmd.DurationDays is < 1)
            throw new InvalidOperationException("Plan duration must be at least one day.");

        plan.Update(cmd.Name, cmd.PriceMinor, cmd.ProjectLimit, cmd.MemberLimit, cmd.SortOrder,
            cmd.AiChatbotEnabled, cmd.DurationDays);
        await planRepo.UpdateAsync(plan, ct);
        return AdminPlanDto.From(plan);
    }
}

/// <summary>Plans are archived, never deleted — existing subscriptions keep referencing them.</summary>
public sealed record AdminSetPlanActiveCommand(int PlanId, bool IsActive) : IRequest<AdminPlanDto>;

public sealed class AdminSetPlanActiveCommandHandler(IPlanRepository planRepo)
    : IRequestHandler<AdminSetPlanActiveCommand, AdminPlanDto>
{
    public async Task<AdminPlanDto> Handle(AdminSetPlanActiveCommand cmd, CancellationToken ct)
    {
        var plan = await planRepo.GetByIdAsync(cmd.PlanId, ct)
            ?? throw new NotFoundException("Plan", cmd.PlanId);

        plan.SetActive(cmd.IsActive);
        await planRepo.UpdateAsync(plan, ct);
        return AdminPlanDto.From(plan);
    }
}

// ── Subscriptions / payments / revenue ───────────────────────────────────────────────

public sealed record AdminSubscriptionDto(
    int SubscriptionId, string? PlanCode, string OwnerType, int? UserId, int? OrganizationId,
    string Status, DateTime? StartedAt, DateTime? CurrentPeriodEnd);

public sealed record AdminListSubscriptionsQuery(string? Status) : IRequest<List<AdminSubscriptionDto>>;

public sealed class AdminListSubscriptionsQueryHandler(ISubscriptionRepository subscriptionRepo)
    : IRequestHandler<AdminListSubscriptionsQuery, List<AdminSubscriptionDto>>
{
    public async Task<List<AdminSubscriptionDto>> Handle(AdminListSubscriptionsQuery query, CancellationToken ct)
    {
        var subs = await subscriptionRepo.GetAllAsync(query.Status, ct);
        return subs.Select(s => new AdminSubscriptionDto(
            s.SubscriptionId, s.Plan?.Code, s.OwnerType, s.UserId, s.OrganizationId,
            s.Status, s.StartedAt, s.CurrentPeriodEnd)).ToList();
    }
}

public sealed record AdminPaymentDto(
    int PaymentTransactionId, int SubscriptionId, string? PlanCode, int? UserId, int? OrganizationId,
    int AmountMinor, string Currency, string Status, string Provider, bool IsTest,
    DateTime CreatedAt, DateTime? CompletedAt);

public sealed record AdminListPaymentsQuery(string? Status) : IRequest<List<AdminPaymentDto>>;

public sealed class AdminListPaymentsQueryHandler(IPaymentTransactionRepository paymentRepo)
    : IRequestHandler<AdminListPaymentsQuery, List<AdminPaymentDto>>
{
    public async Task<List<AdminPaymentDto>> Handle(AdminListPaymentsQuery query, CancellationToken ct)
    {
        var payments = await paymentRepo.GetAllAsync(query.Status, ct);
        return payments.Select(p => new AdminPaymentDto(
            p.PaymentTransactionId, p.SubscriptionId, p.Plan?.Code, p.UserId, p.OrganizationId,
            p.AmountMinor, p.Currency, p.Status, p.Provider, p.IsTest, p.CreatedAt, p.CompletedAt)).ToList();
    }
}

public sealed record SubscriptionAnalyticsPoint(string Period, string PlanCode, string Audience, int Count, int RevenueMinor);

public sealed record SubscriptionAnalyticsDto(
    int ActiveSubscriptions,
    int TotalRevenueMinor,
    int TestRevenueMinor,
    IReadOnlyList<SubscriptionAnalyticsPoint> ByMonth);

public sealed record GetSubscriptionAnalyticsQuery : IRequest<SubscriptionAnalyticsDto>;

public sealed class GetSubscriptionAnalyticsQueryHandler(
    ISubscriptionRepository subscriptionRepo,
    IPaymentTransactionRepository paymentRepo)
    : IRequestHandler<GetSubscriptionAnalyticsQuery, SubscriptionAnalyticsDto>
{
    public async Task<SubscriptionAnalyticsDto> Handle(GetSubscriptionAnalyticsQuery query, CancellationToken ct)
    {
        var subscriptions = await subscriptionRepo.GetAllAsync(SubscriptionStatuses.Active, ct);
        var payments = await paymentRepo.GetAllAsync(PaymentStatuses.Succeeded, ct);

        // Simulated payments are reported separately so they never inflate real revenue figures.
        var realRevenue = payments.Where(p => !p.IsTest).Sum(p => p.AmountMinor);
        var testRevenue = payments.Where(p => p.IsTest).Sum(p => p.AmountMinor);

        var byMonth = payments
            .GroupBy(p => new
            {
                Period = (p.CompletedAt ?? p.CreatedAt).ToString("yyyy-MM"),
                PlanCode = p.Plan?.Code ?? "UNKNOWN",
                Audience = p.OrganizationId is null ? PlanAudiences.Personal : PlanAudiences.Organization
            })
            .Select(g => new SubscriptionAnalyticsPoint(
                g.Key.Period, g.Key.PlanCode, g.Key.Audience, g.Count(), g.Sum(p => p.AmountMinor)))
            .OrderBy(p => p.Period).ThenBy(p => p.PlanCode)
            .ToList();

        return new SubscriptionAnalyticsDto(subscriptions.Count, realRevenue, testRevenue, byMonth);
    }
}
