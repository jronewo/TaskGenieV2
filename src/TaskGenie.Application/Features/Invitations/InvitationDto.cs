namespace TaskGenie.Application.Features.Invitations;

public class InvitationDto
{
    public int InvitationId { get; set; }
    public int? TeamId { get; set; }
    public string? TeamName { get; set; }
    public string? Email { get; set; }
    public string? Status { get; set; }
}
