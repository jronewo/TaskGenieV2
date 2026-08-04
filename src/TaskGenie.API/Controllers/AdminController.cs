using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.API.Authorization;
using TaskGenie.Application.Features.Admin;
using TaskGenie.Application.Features.Organizations.Queries;

namespace TaskGenie.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Policy = AuthorizationPolicies.PlatformAdmin)]
public class AdminController(IMediator mediator) : ControllerBase
{
    [HttpGet("platform-stats")]
    public async Task<IActionResult> GetPlatformStats()
        => Ok(await mediator.Send(new GetPlatformStatsQuery()));

    [HttpGet("subscription-analytics")]
    public async Task<IActionResult> GetSubscriptionAnalytics()
        => Ok(await mediator.Send(new GetSubscriptionAnalyticsQuery()));

    // ── Users ────────────────────────────────────────────────────────────────────────

    [HttpGet("users")]
    public async Task<IActionResult> SearchUsers(
        [FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        => Ok(await mediator.Send(new AdminSearchUsersQuery(search, page, pageSize)));

    [HttpPut("users/{userId}/status")]
    public async Task<IActionResult> SetUserStatus(int userId, [FromBody] SetUserStatusRequest request)
        => Ok(await mediator.Send(new AdminSetUserStatusCommand(userId, request.Status)));

    /// <summary>Suspends an account. Omit days for a permanent ban.</summary>
    [HttpPost("users/{userId}/ban")]
    public async Task<IActionResult> BanUser(int userId, [FromBody] BanUserRequest request)
        => Ok(await mediator.Send(new AdminBanUserCommand(userId, request.Days, request.Reason)));

    [HttpPut("users/{userId}/role")]
    public async Task<IActionResult> SetUserRole(int userId, [FromBody] SetUserRoleRequest request)
        => Ok(await mediator.Send(new AdminSetUserRoleCommand(userId, request.Role)));

    // ── Organizations ────────────────────────────────────────────────────────────────

    [HttpGet("organizations")]
    public async Task<IActionResult> GetOrganizations()
        => Ok(await mediator.Send(new GetAllOrganizationsQuery()));

    // ── Billing ──────────────────────────────────────────────────────────────────────

    [HttpGet("subscriptions")]
    public async Task<IActionResult> GetSubscriptions([FromQuery] string? status)
        => Ok(await mediator.Send(new AdminListSubscriptionsQuery(status?.ToUpperInvariant())));

    [HttpGet("payments")]
    public async Task<IActionResult> GetPayments([FromQuery] string? status)
        => Ok(await mediator.Send(new AdminListPaymentsQuery(status?.ToUpperInvariant())));

    [HttpGet("plans")]
    public async Task<IActionResult> GetPlans()
        => Ok(await mediator.Send(new AdminListPlansQuery()));

    [HttpPost("plans")]
    public async Task<IActionResult> CreatePlan([FromBody] AdminCreatePlanRequest request)
        // VND, not USD: PayOS settles VND exclusively, so a plan priced in anything else could
        // never be checked out.
        => Ok(await mediator.Send(new AdminCreatePlanCommand(
            request.Code, request.Name, request.Audience, request.BillingInterval,
            request.PriceMinor, request.Currency ?? "VND",
            request.ProjectLimit, request.MemberLimit, request.SortOrder,
            request.AiChatbotEnabled, request.DurationDays)));

    [HttpPut("plans/{planId}")]
    public async Task<IActionResult> UpdatePlan(int planId, [FromBody] AdminUpdatePlanRequest request)
        => Ok(await mediator.Send(new AdminUpdatePlanCommand(
            planId, request.Name, request.PriceMinor, request.ProjectLimit, request.MemberLimit,
            request.SortOrder, request.AiChatbotEnabled, request.DurationDays)));

    [HttpPut("plans/{planId}/active")]
    public async Task<IActionResult> SetPlanActive(int planId, [FromBody] SetActiveRequest request)
        => Ok(await mediator.Send(new AdminSetPlanActiveCommand(planId, request.IsActive)));
}

public record SetUserStatusRequest(int Status);
public record SetUserRoleRequest(string Role);
public record SetActiveRequest(bool IsActive);

/// <summary>A null <c>ProjectLimit</c>/<c>MemberLimit</c> means unlimited; a null
/// <c>DurationDays</c> falls back to the billing interval.</summary>
public record AdminCreatePlanRequest(
    string Code, string Name, string Audience, string BillingInterval,
    int PriceMinor, string? Currency, int? ProjectLimit, int? MemberLimit, int SortOrder = 0,
    bool AiChatbotEnabled = false, int? DurationDays = null);

/// <summary>Whole-form update — every field is authoritative, a null limit means unlimited.</summary>
public record AdminUpdatePlanRequest(
    string Name, int PriceMinor, int? ProjectLimit, int? MemberLimit, int SortOrder,
    bool AiChatbotEnabled = false, int? DurationDays = null);

public record BanUserRequest(int? Days, string? Reason);
