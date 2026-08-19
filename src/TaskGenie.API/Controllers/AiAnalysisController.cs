using MediatR;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.Application.Features.AI.Commands;
using TaskGenie.Application.Features.AI.Queries;
using TaskGenie.Application.Features.Tasks.Queries;

namespace TaskGenie.API.Controllers;

[Route("api/ai-analysis")]
[ApiController]
public class AiAnalysisController(IMediator mediator) : ControllerBase
{
    [HttpPost("{taskId}/risk")]
    public async Task<IActionResult> RunRiskAnalysis(int taskId)
    {
        var result = await mediator.Send(new AnalyzeTaskRiskCommand(taskId));
        return result is null ? NotFound(new { message = "Task not found." }) : Ok(result);
    }

    [HttpPost("project/{projectId}/analyze-all")]
    public async Task<IActionResult> RunProjectRiskAnalysis(int projectId)
        => Ok(await mediator.Send(new AnalyzeProjectRisksCommand(projectId)));

    /// <summary>Returns the updated task so the caller can render the generated summary without a
    /// second round-trip — and without dereferencing a bare message object.</summary>
    [HttpPost("{taskId}/summary")]
    public async Task<IActionResult> GenerateSummary(int taskId)
    {
        await mediator.Send(new GenerateTaskSummaryCommand(taskId));
        return Ok(await mediator.Send(new GetTaskByIdQuery(taskId)));
    }

    [HttpPost("{taskId}/classify")]
    public async Task<IActionResult> ClassifyTask(int taskId)
    {
        await mediator.Send(new ClassifyTaskCommand(taskId));
        return Ok(await mediator.Send(new GetTaskByIdQuery(taskId)));
    }

    [HttpGet("project/{projectId}/workload")]
    public async Task<IActionResult> GetWorkloadSuggestions(int projectId)
        => Ok(await mediator.Send(new GetWorkloadSuggestionsQuery(projectId)));

    [HttpGet("{taskId}")]
    public async Task<IActionResult> GetAnalysis(int taskId)
        => Ok(await mediator.Send(new GetTaskAnalysesQuery(taskId)));

    [HttpGet("{taskId}/risk-history")]
    public async Task<IActionResult> GetRiskHistory(int taskId)
        => Ok(await mediator.Send(new GetRiskHistoryQuery(taskId)));

    /// <summary>Assistant chat. Scoped to the caller's own work, or to one project they may read.</summary>
    [HttpPost("assistant")]
    public async Task<IActionResult> AskAssistant([FromBody] AskAssistantRequest request)
        => Ok(await mediator.Send(new AskAssistantQuery(request.Question, request.ProjectId)));

    /// <summary>The project agent. It acts as the caller — every tool it uses re-checks their
    /// permissions, so it can never reach a project they could not open themselves.</summary>
    [HttpPost("agent")]
    public async Task<IActionResult> RunAgent([FromBody] RunAgentRequest request)
        => Ok(await mediator.Send(new RunAgentQuery(request.Message, request.ProjectId)));

    [HttpGet("{taskId}/executions")]
    public async Task<IActionResult> GetExecutionLogs(int taskId)
        => Ok(await mediator.Send(new GetAiExecutionLogsQuery(taskId)));
}

public sealed record AskAssistantRequest(string Question, int? ProjectId);

public sealed record RunAgentRequest(string Message, int? ProjectId);
