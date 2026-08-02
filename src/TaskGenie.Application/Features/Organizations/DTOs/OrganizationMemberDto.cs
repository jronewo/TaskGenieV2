using TaskGenie.Domain.Entities;

namespace TaskGenie.Application.Features.Organizations.DTOs;

public sealed class OrganizationMemberDto
{
    public int OrganizationMemberId { get; init; }
    public int OrganizationId { get; init; }
    public int UserId { get; init; }
    public string? UserName { get; init; }
    public string? Email { get; init; }
    public string? Avatar { get; init; }
    public string Role { get; init; } = OrganizationRoles.Member;
    public string Status { get; init; } = OrganizationMemberStatuses.Active;
    public DateTime JoinedAt { get; init; }

    public static OrganizationMemberDto FromEntity(OrganizationMember m) => new()
    {
        OrganizationMemberId = m.OrganizationMemberId,
        OrganizationId = m.OrganizationId,
        UserId = m.UserId,
        UserName = m.User?.Name,
        Email = m.User?.Email,
        Avatar = m.User?.Avatar,
        Role = m.Role,
        Status = m.Status,
        JoinedAt = m.JoinedAt
    };
}
