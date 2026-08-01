using MediatR;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.API.Extensions;
using TaskGenie.Application.Features.Organizations.Commands;
using TaskGenie.Application.Features.Organizations.Queries;

namespace TaskGenie.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class OrganizationsController(IMediator mediator) : ControllerBase
{
    [HttpGet("admin/all")]
    public async Task<IActionResult> GetAllOrganizations()
        => Ok(await mediator.Send(new GetAllOrganizationsQuery()));

    [HttpGet("my")]
    public async Task<IActionResult> GetMyOrganization()
    {
        var userId = HttpContext.GetCurrentUserId();
        var orgs = await mediator.Send(new GetAllOrganizationsQuery());
        var myOrg = orgs.FirstOrDefault(o => o.OwnerId == userId);
        if (myOrg is null) return NotFound(new { message = "You do not own any organization." });

        var fullOrg = await mediator.Send(new GetOrganizationByIdQuery(myOrg.OrganizationId));
        var projects = await mediator.Send(new GetOrganizationProjectsQuery(myOrg.OrganizationId));
        return Ok(new { org = fullOrg, projects });
    }

    /// <summary>Every organization the current user belongs to (any role) — the FE's
    /// post-login organization-context call.</summary>
    [HttpGet("mine")]
    public async Task<IActionResult> GetMyOrganizations()
        => Ok(await mediator.Send(new GetMyOrganizationsQuery()));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOrganizationRequest request)
    {
        var org = await mediator.Send(new CreateOrganizationCommand(request.Name, request.Description));
        return CreatedAtAction(nameof(GetOrganization), new { orgId = org.OrganizationId }, org);
    }

    [HttpPut("{orgId}")]
    public async Task<IActionResult> Update(int orgId, [FromBody] UpdateOrganizationRequest request)
        => Ok(await mediator.Send(new UpdateOrganizationCommand(orgId, request.Name, request.Description, request.Logo)));

    [HttpGet("{orgId}/members")]
    public async Task<IActionResult> GetMembers(int orgId)
        => Ok(await mediator.Send(new GetOrganizationMembersQuery(orgId)));

    [HttpPost("{orgId}/members")]
    public async Task<IActionResult> AddMember(int orgId, [FromBody] AddOrganizationMemberRequest request)
    {
        var member = await mediator.Send(new AddOrganizationMemberCommand(orgId, request.UserId, request.Email, request.Role ?? "MEMBER"));
        return Ok(member);
    }

    [HttpPut("{orgId}/members/{organizationMemberId}/role")]
    public async Task<IActionResult> UpdateMemberRole(int orgId, int organizationMemberId, [FromBody] UpdateOrganizationMemberRoleRequest request)
        => Ok(await mediator.Send(new UpdateOrganizationMemberRoleCommand(orgId, organizationMemberId, request.Role)));

    [HttpDelete("{orgId}/members/{organizationMemberId}")]
    public async Task<IActionResult> RemoveMember(int orgId, int organizationMemberId)
    {
        await mediator.Send(new RemoveOrganizationMemberCommand(orgId, organizationMemberId));
        return NoContent();
    }

    [HttpPost("{orgId}/projects/{projectId}/assign-member")]
    public async Task<IActionResult> AssignProjectMember(int orgId, int projectId, [FromBody] AssignProjectMemberRequest request)
    {
        await mediator.Send(new AssignOrganizationProjectMemberCommand(orgId, projectId, request.UserId, request.Role));
        return Ok(new { message = "Member assigned to project." });
    }

    [HttpGet("{orgId}")]
    public async Task<IActionResult> GetOrganization(int orgId)
        => Ok(await mediator.Send(new GetOrganizationByIdQuery(orgId)));

    [HttpGet("{orgId}/projects")]
    public async Task<IActionResult> GetOrganizationProjects(int orgId)
        => Ok(await mediator.Send(new GetOrganizationProjectsQuery(orgId)));

    [HttpGet("{orgId}/projects/{projectId}")]
    public async Task<IActionResult> GetProjectDetail(int orgId, int projectId)
        => Ok(await mediator.Send(new GetOrganizationProjectDetailQuery(orgId, projectId)));

    [HttpPost("{orgId}/projects/{projectId}/evaluate")]
    public async Task<IActionResult> EvaluateProject(
        int orgId,
        int projectId,
        [FromBody] EvaluateProjectRequest request)
    {
        await mediator.Send(new EvaluateProjectCommand(
            projectId,
            request.EvaluatorId,
            request.OverallScore,
            request.QualityScore,
            request.TimelinessScore,
            request.CommunicationScore,
            request.Comment));
        return Ok(new { message = "Project evaluation submitted successfully." });
    }

    [HttpGet("{orgId}/projects/{projectId}/evaluation")]
    public async Task<IActionResult> GetProjectEvaluation(int orgId, int projectId)
        => Ok(await mediator.Send(new GetProjectEvaluationQuery(projectId)));
}

public record EvaluateProjectRequest(
    int EvaluatorId,
    int? OverallScore,
    int? QualityScore,
    int? TimelinessScore,
    int? CommunicationScore,
    string? Comment);

public record CreateOrganizationRequest(string Name, string? Description);
public record UpdateOrganizationRequest(string? Name, string? Description, string? Logo);
public record AddOrganizationMemberRequest(int? UserId, string? Email, string? Role);
public record UpdateOrganizationMemberRoleRequest(string Role);
public record AssignProjectMemberRequest(int UserId, string Role);
