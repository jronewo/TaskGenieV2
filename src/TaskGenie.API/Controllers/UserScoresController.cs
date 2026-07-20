using MediatR;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.Application.Features.RewardPenalty.Commands;
using TaskGenie.Application.Features.RewardPenalty.Queries;

namespace TaskGenie.API.Controllers;

[Route("api/user-scores")]
[ApiController]
public class UserScoresController(IMediator mediator) : ControllerBase
{
    /// <summary>Lịch sử điểm thưởng/phạt của một user.</summary>
    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetHistory(int userId)
        => Ok(await mediator.Send(new GetUserScoreHistoryQuery(userId)));

    /// <summary>Tổng điểm + level của một user.</summary>
    [HttpGet("user/{userId}/summary")]
    public async Task<IActionResult> GetSummary(int userId)
        => Ok(await mediator.Send(new GetUserScoreSummaryQuery(userId)));

    /// <summary>Bảng xếp hạng điểm theo project.</summary>
    [HttpGet("project/{projectId}/leaderboard")]
    public async Task<IActionResult> GetProjectLeaderboard(int projectId)
        => Ok(await mediator.Send(new GetProjectScoreLeaderboardQuery(projectId)));

    /// <summary>Leader/Admin tự tay cộng hoặc trừ điểm.</summary>
    [HttpPost("manual")]
    public async Task<IActionResult> ApplyManual([FromBody] ApplyManualScoreRequest request)
    {
        var result = await mediator.Send(new ApplyManualScoreCommand(
            request.UserId,
            request.Type,
            request.Amount,
            request.Reason,
            request.TaskId,
            request.ProjectId));
        return Ok(result);
    }
}

public record ApplyManualScoreRequest(
    int UserId,
    string Type,
    int Amount,
    string Reason,
    int? TaskId,
    int? ProjectId);
