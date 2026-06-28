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

    public static Organization Create(string name, string? description, int ownerId) => new()
    {
        Name = name,
        Description = description,
        OwnerId = ownerId,
        CreatedAt = DateTime.UtcNow
    };
}
