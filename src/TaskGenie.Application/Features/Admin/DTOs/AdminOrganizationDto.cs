namespace TaskGenie.Application.Features.Admin.DTOs;

public sealed class AdminOrganizationDto
{
    public int OrganizationId { get; init; }
    public string Name { get; init; } = null!;
    public string? Description { get; init; }
    public int? OwnerId { get; init; }
    public string? OwnerName { get; init; }
    public int MemberCount { get; init; }
    public int ProjectCount { get; init; }
    public string CurrentPlanCode { get; init; } = null!;
    public string CurrentPlanName { get; init; } = null!;
    public string SubscriptionStatus { get; init; } = null!;
    public DateTime? CreatedAt { get; init; }
}
