using System;

namespace TaskGenie.Domain.Entities;

/// <summary>Membership of a user in an organization. A user may belong to several organizations
/// with a different role in each. Only one ACTIVE row may exist per (OrganizationId, UserId).</summary>
public class OrganizationMember
{
    protected OrganizationMember() { }

    public int OrganizationMemberId { get; internal set; }

    public int OrganizationId { get; internal set; }

    public int UserId { get; internal set; }

    /// <summary>OWNER | ORG_ADMIN | MEMBER</summary>
    public string Role { get; internal set; } = OrganizationRoles.Member;

    /// <summary>ACTIVE | REMOVED</summary>
    public string Status { get; internal set; } = OrganizationMemberStatuses.Active;

    public DateTime JoinedAt { get; internal set; }

    public int? InvitedBy { get; internal set; }

    public DateTime? UpdatedAt { get; internal set; }

    public virtual Organization? Organization { get; internal set; }

    public virtual User? User { get; internal set; }

    public bool IsActive => Status == OrganizationMemberStatuses.Active;

    /// <summary>True when this member may manage other members and organization settings.</summary>
    public bool CanManageMembers =>
        IsActive && (Role == OrganizationRoles.Owner || Role == OrganizationRoles.OrgAdmin);

    public static OrganizationMember Create(int organizationId, int userId, string role, int? invitedBy = null)
        => new()
        {
            OrganizationId = organizationId,
            UserId = userId,
            Role = role,
            Status = OrganizationMemberStatuses.Active,
            JoinedAt = DateTime.UtcNow,
            InvitedBy = invitedBy
        };

    public void ChangeRole(string role)
    {
        Role = role;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Remove()
    {
        Status = OrganizationMemberStatuses.Removed;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Reinstate(string role)
    {
        Status = OrganizationMemberStatuses.Active;
        Role = role;
        UpdatedAt = DateTime.UtcNow;
    }
}

public static class OrganizationRoles
{
    public const string Owner = "OWNER";
    public const string OrgAdmin = "ORG_ADMIN";
    public const string Member = "MEMBER";

    public static bool IsValid(string role) => role is Owner or OrgAdmin or Member;
}

public static class OrganizationMemberStatuses
{
    public const string Active = "ACTIVE";
    public const string Removed = "REMOVED";
}
