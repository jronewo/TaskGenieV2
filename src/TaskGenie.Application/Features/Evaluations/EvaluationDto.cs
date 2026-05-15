namespace TaskGenie.Application.Features.Evaluations;

public class EvaluationDto
{
    public int EvaluationId { get; set; }
    public int UserId { get; set; }
    public string? UserName { get; set; }
    public int? LeaderId { get; set; }
    public string? LeaderName { get; set; }
    public int? SkillScore { get; set; }
    public int? TeamworkScore { get; set; }
    public int? DeadlineScore { get; set; }
    public int? CommunicationScore { get; set; }
    public DateTime? CreatedAt { get; set; }
}
