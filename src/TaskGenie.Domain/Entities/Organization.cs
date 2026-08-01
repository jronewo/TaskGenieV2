using System;
using System.Collections.Generic;

namespace TaskGenie.Domain.Entities;

public class Organization
{
    protected Organization() { }

    public int OrganizationId { get; internal set; }

    public string Name { get; internal set; } = null!;

    public string? Description { get; internal set; }

    public string? Logo { get; internal set; }

    public int? OwnerId { get; internal set; }

    public DateTime? CreatedAt { get; internal set; }

    public DateTime? UpdatedAt { get; internal set; }

    public virtual User? Owner { get; internal set; }

    public virtual ICollection<Project> Projects { get; internal set; } = new List<Project>();

    public virtual ICollection<OrganizationMember> Members { get; internal set; } = new List<OrganizationMember>();

    public static Organization Create(string name, string? description, int ownerId) => new()
    {
        Name = name,
        Description = description,
        OwnerId = ownerId,
        CreatedAt = DateTime.UtcNow
    };

    public void Update(string? name, string? description, string? logo)
    {
        if (!string.IsNullOrWhiteSpace(name)) Name = name;
        if (description is not null) Description = description;
        if (logo is not null) Logo = logo;
        UpdatedAt = DateTime.UtcNow;
    }
}
