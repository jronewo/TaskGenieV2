using System;
using System.Collections.Generic;

namespace TaskGenie.Domain.Entities;

public class TeamMember
{
    protected TeamMember() { }

    public int Id { get; internal set; }

    public int? TeamId { get; internal set; }

    public int? UserId { get; internal set; }

    public string? Role { get; internal set; }

    public virtual Team? Team { get; internal set; }

    public virtual User? User { get; internal set; }

    public static TeamMember Create(int teamId, int userId, string role = "MEMBER") => new() { TeamId = teamId, UserId = userId, Role = role };

    public void ChangeRole(string role) => Role = role;
}
