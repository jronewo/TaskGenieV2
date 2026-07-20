namespace TaskGenie.Application.Features.RewardPenalty;

public class UserScoreSummaryDto
{
    public int UserId { get; set; }
    public string? UserName { get; set; }
    public string? Avatar { get; set; }
    public int TotalScore { get; set; }
    public int TotalRewardPoints { get; set; }
    public int TotalPenaltyPoints { get; set; }
    public string Level { get; set; } = null!;
    public int LevelMinScore { get; set; }
    public int LevelMaxScore { get; set; }
    public int ProgressToNextLevel { get; set; }
}

public class ProjectScoreLeaderboardDto
{
    public int ProjectId { get; set; }
    public string? ProjectName { get; set; }
    public List<UserScoreSummaryDto> Members { get; set; } = [];
}
