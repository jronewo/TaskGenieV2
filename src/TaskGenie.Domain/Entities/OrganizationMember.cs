using System;

namespace TaskGenie.Domain.Entities;

public static class OrganizationRole
{
    public const string Owner = "OWNER";
    public const string Admin = "ADMIN";
    public const string Member = "MEMBER";

    public static bool IsValid(string role) => role is Owner or Admin or Member;
}

public class OrganizationMember
{
    protected OrganizationMember() { }

    public int OrganizationMemberId { get; internal set; }

    public int OrganizationId { get; internal set; }

    public int UserId { get; internal set; }

    public string Role { get; internal set; } = OrganizationRole.Member;

    public DateTime CreatedAt { get; internal set; }

    public DateTime? UpdatedAt { get; internal set; }

    public virtual Organization? Organization { get; internal set; }

    public virtual User? User { get; internal set; }

    public static OrganizationMember Create(int organizationId, int userId, string role) => new()
    {
        OrganizationId = organizationId,
        UserId = userId,
        Role = role,
        CreatedAt = DateTime.UtcNow
    };

    public void ChangeRole(string role)
    {
        Role = role;
        UpdatedAt = DateTime.UtcNow;
    }
}
