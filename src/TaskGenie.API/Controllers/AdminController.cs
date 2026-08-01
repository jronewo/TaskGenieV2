using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.API.Authorization;
using TaskGenie.Application.Features.Admin;
using TaskGenie.Application.Features.Admin.Commands;
using TaskGenie.Application.Features.Admin.Queries;

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
    public async Task<IActionResult> GetSubscriptionAnalytics([FromQuery] int monthsBack = 6)
        => Ok(await mediator.Send(new GetSubscriptionAnalyticsQuery(monthsBack)));

    // ---- Users ----

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? search = null)
        => Ok(await mediator.Send(new GetAdminUsersQuery(page, pageSize, search)));

    [HttpGet("users/{userId}")]
    public async Task<IActionResult> GetUser(int userId)
        => Ok(await mediator.Send(new GetAdminUserByIdQuery(userId)));

    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] AdminCreateUserRequest request)
    {
        var user = await mediator.Send(new AdminCreateUserCommand(request.Name, request.Email, request.Password, request.Role ?? "NORMAL_USER"));
        return CreatedAtAction(nameof(GetUser), new { userId = user.UserId }, user);
    }

    [HttpPut("users/{userId}/status")]
    public async Task<IActionResult> UpdateUserStatus(int userId, [FromBody] UpdateUserStatusRequest request)
        => Ok(await mediator.Send(new UpdateUserStatusCommand(userId, request.Status)));

    [HttpPut("users/{userId}/role")]
    public async Task<IActionResult> UpdateUserRole(int userId, [FromBody] UpdateUserRoleRequest request)
        => Ok(await mediator.Send(new UpdateUserPlatformRoleCommand(userId, request.Role)));

    [HttpDelete("users/{userId}")]
    public async Task<IActionResult> DeleteUser(int userId)
    {
        await mediator.Send(new DeleteUserCommand(userId));
        return NoContent();
    }

    // ---- Organizations ----

    [HttpGet("organizations")]
    public async Task<IActionResult> GetOrganizations([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? search = null)
        => Ok(await mediator.Send(new GetAdminOrganizationsQuery(page, pageSize, search)));

    [HttpGet("organizations/{organizationId}")]
    public async Task<IActionResult> GetOrganizationDetail(int organizationId)
        => Ok(await mediator.Send(new GetAdminOrganizationDetailQuery(organizationId)));

    // ---- Subscriptions & Payments (read-only, simulated gateway data) ----

    [HttpGet("subscriptions")]
    public async Task<IActionResult> GetSubscriptions(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null, [FromQuery] string? scope = null, [FromQuery] int? planId = null)
        => Ok(await mediator.Send(new GetAdminSubscriptionsQuery(page, pageSize, status, scope, planId)));

    [HttpGet("payments")]
    public async Task<IActionResult> GetPayments(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null, [FromQuery] string? scope = null, [FromQuery] int? planId = null,
        [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
        => Ok(await mediator.Send(new GetAdminPaymentsQuery(page, pageSize, status, scope, planId, from, to)));

    // ---- Plans ----

    [HttpGet("plans")]
    public async Task<IActionResult> GetPlans()
        => Ok(await mediator.Send(new GetAdminPlansQuery()));

    [HttpPost("plans")]
    public async Task<IActionResult> CreatePlan([FromBody] CreatePlanRequest request)
    {
        var plan = await mediator.Send(new CreatePlanCommand(
            request.Code, request.Name, request.Scope, request.PriceCents,
            request.BillingPeriodDays, request.ProjectLimit, request.Features, request.IsActive));
        return Ok(plan);
    }

    [HttpPut("plans/{planId}")]
    public async Task<IActionResult> UpdatePlan(int planId, [FromBody] UpdatePlanRequest request)
        => Ok(await mediator.Send(new UpdatePlanCommand(
            planId, request.Name, request.PriceCents, request.BillingPeriodDays, request.ProjectLimit, request.Features)));

    [HttpPut("plans/{planId}/active")]
    public async Task<IActionResult> SetPlanActive(int planId, [FromBody] SetPlanActiveRequest request)
        => Ok(await mediator.Send(new SetPlanActiveCommand(planId, request.IsActive)));
}

public record AdminCreateUserRequest(string Name, string Email, string Password, string? Role);
public record UpdateUserStatusRequest(int Status);
public record UpdateUserRoleRequest(string Role);
public record CreatePlanRequest(
    string Code, string Name, string Scope, int PriceCents, int BillingPeriodDays,
    int? ProjectLimit, string? Features, bool IsActive);
public record UpdatePlanRequest(string Name, int PriceCents, int BillingPeriodDays, int? ProjectLimit, string? Features);
public record SetPlanActiveRequest(bool IsActive);
