using MediatR;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.Application.Features.AI.Commands;
using TaskGenie.Application.Features.AI.Queries;

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

    [HttpPost("{taskId}/summary")]
    public async Task<IActionResult> GenerateSummary(int taskId)
    {
        await mediator.Send(new GenerateTaskSummaryCommand(taskId));
        return Ok(new { message = "Task summary generated successfully." });
    }

    [HttpPost("{taskId}/classify")]
    public async Task<IActionResult> ClassifyTask(int taskId)
    {
        await mediator.Send(new ClassifyTaskCommand(taskId));
        return Ok(new { message = "Task classification and analysis completed successfully." });
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

    [HttpGet("{taskId}/executions")]
    public async Task<IActionResult> GetExecutionLogs(int taskId)
        => Ok(await mediator.Send(new GetAiExecutionLogsQuery(taskId)));
}
