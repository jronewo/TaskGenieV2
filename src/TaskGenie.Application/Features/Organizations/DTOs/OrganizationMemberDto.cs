using TaskGenie.Domain.Entities;

namespace TaskGenie.Application.Features.Organizations.DTOs;

public sealed class OrganizationMemberDto
{
    public int OrganizationMemberId { get; init; }
    public int OrganizationId { get; init; }
    public int UserId { get; init; }
    public string? UserName { get; init; }
    public string? UserEmail { get; init; }
    public string Role { get; init; } = null!;
    public DateTime CreatedAt { get; init; }

    public static OrganizationMemberDto FromEntity(OrganizationMember m) => new()
    {
        OrganizationMemberId = m.OrganizationMemberId,
        OrganizationId = m.OrganizationId,
        UserId = m.UserId,
        UserName = m.User?.Name,
        UserEmail = m.User?.Email,
        Role = m.Role,
        CreatedAt = m.CreatedAt
    };
}
