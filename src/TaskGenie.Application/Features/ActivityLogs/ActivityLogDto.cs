namespace TaskGenie.Application.Features.ActivityLogs;

public class ActivityLogDto
{
    public int LogId { get; set; }
    public int? UserId { get; set; }
    public string? UserName { get; set; }
    public string? Action { get; set; }
    public string? EntityType { get; set; }
    public int? EntityId { get; set; }
    public DateTime? CreatedAt { get; set; }
}
