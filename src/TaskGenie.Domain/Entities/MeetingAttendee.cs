namespace TaskGenie.Domain.Entities;

public class MeetingAttendee
{
    protected MeetingAttendee() { }

    public int Id { get; internal set; }

    public int MeetingId { get; internal set; }

    public int UserId { get; internal set; }

    public string? Status { get; internal set; }

    public virtual Meeting? Meeting { get; internal set; }

    public virtual User? User { get; internal set; }

    public static MeetingAttendee Create(int meetingId, int userId) => new()
    {
        MeetingId = meetingId,
        UserId = userId,
        Status = "Invited"
    };

    public void UpdateStatus(string status) => Status = status;
}
