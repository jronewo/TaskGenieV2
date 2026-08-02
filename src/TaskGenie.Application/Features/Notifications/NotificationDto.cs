namespace TaskGenie.Application.Features.Notifications;

public class NotificationDto
{
    public int NotificationId { get; set; }
    public int? UserId { get; set; }
    public string? Type { get; set; }
    public string? Title { get; set; }
    public string? Message { get; set; }
    public int? ReferenceId { get; set; }
    public string? ReferenceType { get; set; }
    /// <summary>Where the work lives, so the reader can navigate straight there.</summary>
    public int? ProjectId { get; set; }
    public string? ProjectName { get; set; }
    /// <summary>An image attached to the comment this notification is about.</summary>
    public string? ImageUrl { get; set; }
    public bool IsRead { get; set; }
    public DateTime? CreatedAt { get; set; }
}
