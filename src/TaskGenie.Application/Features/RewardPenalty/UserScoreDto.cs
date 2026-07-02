namespace TaskGenie.Application.Features.RewardPenalty;

public class UserScoreDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string? UserName { get; set; }
    public int? TaskId { get; set; }
    public string? TaskTitle { get; set; }
    public int? ProjectId { get; set; }
    public string? ProjectName { get; set; }
    public string Type { get; set; } = null!;
    public int Amount { get; set; }
    public string? Reason { get; set; }
    public DateTime CreatedAt { get; set; }
}
