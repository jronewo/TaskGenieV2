using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.API.Authorization;
using TaskGenie.Application.Features.Organizations.Commands;
using TaskGenie.Application.Features.Organizations.Queries;

namespace TaskGenie.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class OrganizationsController(IMediator mediator) : ControllerBase
{
    [Authorize(Policy = AuthorizationPolicies.PlatformAdmin)]
    [HttpGet("admin/all")]
    public async Task<IActionResult> GetAllOrganizations()
        => Ok(await mediator.Send(new GetAllOrganizationsQuery()));

    /// <summary>Every organization the caller is an active member of (drives the switcher).</summary>
    [HttpGet("mine")]
    public async Task<IActionResult> GetMine()
        => Ok(await mediator.Send(new GetMyOrganizationsQuery()));

    /// <summary>The organization the caller owns, with its projects.</summary>
    [HttpGet("my")]
    public async Task<IActionResult> GetMyOrganization()
    {
        var result = await mediator.Send(new GetMyOrganizationQuery());
        if (result is null) return NotFound(new { message = "You do not own any organization." });
        return Ok(new { org = result.Organization, projects = result.Projects });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOrganizationRequest request)
    {
        var org = await mediator.Send(new CreateOrganizationCommand(request.Name, request.Description));
        return CreatedAtAction(nameof(GetOrganization), new { orgId = org.OrganizationId }, org);
    }

    [HttpGet("{orgId}")]
    public async Task<IActionResult> GetOrganization(int orgId)
        => Ok(await mediator.Send(new GetOrganizationByIdQuery(orgId)));

    [HttpPut("{orgId}")]
    public async Task<IActionResult> Update(int orgId, [FromBody] UpdateOrganizationRequest request)
        => Ok(await mediator.Send(new UpdateOrganizationCommand(orgId, request.Name, request.Description, request.Logo)));

    // ── Members ──────────────────────────────────────────────────────────────────────

    [HttpGet("{orgId}/members")]
    public async Task<IActionResult> GetMembers(int orgId)
        => Ok(await mediator.Send(new GetOrganizationMembersQuery(orgId)));

    [HttpPost("{orgId}/members")]
    public async Task<IActionResult> AddMember(int orgId, [FromBody] AddOrganizationMemberRequest request)
        => Ok(await mediator.Send(new AddOrganizationMemberCommand(orgId, request.Email, request.Role)));

    [HttpPut("{orgId}/members/{memberId}/role")]
    public async Task<IActionResult> UpdateMemberRole(int orgId, int memberId, [FromBody] UpdateMemberRoleRequest request)
        => Ok(await mediator.Send(new UpdateOrganizationMemberRoleCommand(orgId, memberId, request.Role)));

    [HttpDelete("{orgId}/members/{memberId}")]
    public async Task<IActionResult> RemoveMember(int orgId, int memberId)
    {
        await mediator.Send(new RemoveOrganizationMemberCommand(orgId, memberId));
        return NoContent();
    }

    // ── Projects ─────────────────────────────────────────────────────────────────────

    [HttpGet("{orgId}/projects")]
    public async Task<IActionResult> GetOrganizationProjects(int orgId)
        => Ok(await mediator.Send(new GetOrganizationProjectsQuery(orgId)));

    [HttpGet("{orgId}/projects/{projectId}")]
    public async Task<IActionResult> GetProjectDetail(int orgId, int projectId)
        => Ok(await mediator.Send(new GetOrganizationProjectDetailQuery(orgId, projectId)));

    [HttpPost("{orgId}/projects/{projectId}/assign-member")]
    public async Task<IActionResult> AssignMember(int orgId, int projectId, [FromBody] AssignMemberRequest request)
    {
        await mediator.Send(new AssignOrganizationMemberToProjectCommand(
            orgId, projectId, request.UserId, request.AsLeader));
        return Ok(new { message = request.AsLeader ? "Project leader assigned." : "Member assigned to project." });
    }

    [HttpPost("{orgId}/projects/{projectId}/evaluate")]
    public async Task<IActionResult> EvaluateProject(
        int orgId,
        int projectId,
        [FromBody] EvaluateProjectRequest request)
    {
        await mediator.Send(new EvaluateProjectCommand(
            orgId,
            projectId,
            request.OverallScore,
            request.QualityScore,
            request.TimelinessScore,
            request.CommunicationScore,
            request.Comment));
        return Ok(new { message = "Project evaluation submitted successfully." });
    }

    [HttpGet("{orgId}/projects/{projectId}/evaluation")]
    public async Task<IActionResult> GetProjectEvaluation(int orgId, int projectId)
        => Ok(await mediator.Send(new GetProjectEvaluationQuery(orgId, projectId)));
}

public record CreateOrganizationRequest(string Name, string? Description);
public record UpdateOrganizationRequest(string? Name, string? Description, string? Logo);
public record AddOrganizationMemberRequest(string Email, string Role);
public record UpdateMemberRoleRequest(string Role);
public record AssignMemberRequest(int UserId, bool AsLeader = false);

public record EvaluateProjectRequest(
    int? OverallScore,
    int? QualityScore,
    int? TimelinessScore,
    int? CommunicationScore,
    string? Comment);
