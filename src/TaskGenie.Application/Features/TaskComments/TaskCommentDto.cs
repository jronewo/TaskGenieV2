namespace TaskGenie.Application.Features.TaskComments;

public class TaskCommentDto
{
    public int CommentId { get; set; }
    public int? TaskId { get; set; }
    public int? UserId { get; set; }
    public string? UserName { get; set; }
    public string? UserAvatar { get; set; }
    public string? Content { get; set; }
    public string? ImageUrl { get; set; }
    public DateTime? CreatedAt { get; set; }
}
