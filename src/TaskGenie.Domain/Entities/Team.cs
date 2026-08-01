using System;
using System.Collections.Generic;

namespace TaskGenie.Domain.Entities;

public class Team
{
    protected Team() { }

    public int TeamId { get; internal set; }

    public string? Name { get; internal set; }

    public string? Description { get; internal set; }

    public int? CreatedBy { get; internal set; }

    /// <summary>True when this team was auto-created purely to back a single project (created via
    /// project create/add-member flows), not an independently managed/shared team. Only teams with
    /// this flag set are eligible for automatic cleanup when their owning project is deleted or
    /// reassigned away from them — a standalone/shared team is never auto-deleted.</summary>
    public bool IsProjectManaged { get; internal set; }

    public virtual User? CreatedByNavigation { get; internal set; }

    public virtual ICollection<Invitation> Invitations { get; internal set; } = new List<Invitation>();

    public virtual ICollection<Project> Projects { get; internal set; } = new List<Project>();

    public virtual ICollection<TeamMember> TeamMembers { get; internal set; } = new List<TeamMember>();

    public static Team Create(string name, string? description, int createdBy, bool isProjectManaged = false) => new()
    {
        Name = name,
        Description = description,
        CreatedBy = createdBy,
        IsProjectManaged = isProjectManaged
    };
}
