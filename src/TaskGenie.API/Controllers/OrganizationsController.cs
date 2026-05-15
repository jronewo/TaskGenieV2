using MediatR;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.API.Middleware;
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
