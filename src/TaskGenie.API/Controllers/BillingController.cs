using MediatR;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.API.Controllers;

[Route("api/plans")]
[ApiController]
public class PlansController(IPlanRepository planRepo) : ControllerBase
{
    /// <summary>Public catalog — active plans only. Prices come from the database, never hardcoded
    /// in the client.</summary>
    [HttpGet]
    public async Task<IActionResult> GetPlans([FromQuery] string? audience)
    {
        var normalised = audience?.ToUpperInvariant();
        if (normalised is not null && !PlanAudiences.IsValid(normalised))
            return BadRequest(new { message = "audience must be PERSONAL or ORGANIZATION." });

        var plans = await planRepo.GetAllAsync(activeOnly: true, audience: normalised);
        return Ok(plans.Select(PlanResponse.From));
    }
}

[Route("api/billing")]
[ApiController]
public class BillingController(
    IBillingService billing,
    IEntitlementService entitlements,
    ICurrentUser currentUser) : ControllerBase
{
    /// <summary>Effective plan, quota and Premium status for the caller (or an organization).</summary>
    [HttpGet("entitlement")]
    public async Task<IActionResult> GetEntitlement([FromQuery] int? organizationId)
        => Ok(organizationId is int orgId
            ? await entitlements.GetForOrganizationAsync(orgId)
            : await entitlements.GetForUserAsync(currentUser.UserId));

    [HttpPost("checkout-sessions")]
    public async Task<IActionResult> CreateCheckout([FromBody] CreateCheckoutRequest request)
        => Ok(await billing.CreateCheckoutAsync(request.PlanId, request.OrganizationId, request.IdempotencyKey));

    [HttpGet("subscription")]
    public async Task<IActionResult> GetSubscription([FromQuery] int? organizationId)
    {
        var subscription = await billing.GetCurrentSubscriptionAsync(organizationId);
        return Ok(subscription is null ? null : SubscriptionResponse.From(subscription));
    }

    [HttpPost("subscription/cancel")]
    public async Task<IActionResult> CancelSubscription([FromBody] CancelSubscriptionRequest request)
    {
        var subscription = await billing.CancelSubscriptionAsync(request.OrganizationId, request.AtPeriodEnd);
        return Ok(SubscriptionResponse.From(subscription));
    }

    [HttpGet("payments")]
    public async Task<IActionResult> GetPayments([FromQuery] int? organizationId)
    {
        var payments = await billing.GetPaymentHistoryAsync(organizationId);
        return Ok(payments.Select(PaymentResponse.From));
    }
}

public record CreateCheckoutRequest(int PlanId, int? OrganizationId, string? IdempotencyKey);
public record CancelSubscriptionRequest(int? OrganizationId, bool AtPeriodEnd = true);

public record PlanResponse(
    int PlanId, string Code, string Name, string Audience, string BillingInterval,
    int PriceMinor, string Currency, int? ProjectLimit, int? MemberLimit, bool IsActive)
{
    public static PlanResponse From(Plan p) => new(
        p.PlanId, p.Code, p.Name, p.Audience, p.BillingInterval,
        p.PriceMinor, p.Currency, p.ProjectLimit, p.MemberLimit, p.IsActive);
}

public record SubscriptionResponse(
    int SubscriptionId, int PlanId, string? PlanCode, string? PlanName, string OwnerType,
    int? UserId, int? OrganizationId, string Status,
    DateTime? StartedAt, DateTime? CurrentPeriodEnd, bool CancelAtPeriodEnd)
{
    public static SubscriptionResponse From(Subscription s) => new(
        s.SubscriptionId, s.PlanId, s.Plan?.Code, s.Plan?.Name, s.OwnerType,
        s.UserId, s.OrganizationId, s.Status, s.StartedAt, s.CurrentPeriodEnd, s.CancelAtPeriodEnd);
}

public record PaymentResponse(
    int PaymentTransactionId, int SubscriptionId, int PlanId, string? PlanName,
    int AmountMinor, string Currency, string Status, string Provider, bool IsTest,
    DateTime CreatedAt, DateTime? CompletedAt)
{
    public static PaymentResponse From(PaymentTransaction p) => new(
        p.PaymentTransactionId, p.SubscriptionId, p.PlanId, p.Plan?.Name,
        p.AmountMinor, p.Currency, p.Status, p.Provider, p.IsTest, p.CreatedAt, p.CompletedAt);
}
