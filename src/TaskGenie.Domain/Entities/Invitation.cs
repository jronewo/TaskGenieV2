using System;
using System.Collections.Generic;

namespace TaskGenie.Domain.Entities;

public class Invitation
{
    protected Invitation() { }

    public int InvitationId { get; internal set; }

    public int? TeamId { get; internal set; }

    public string? Email { get; internal set; }

    public string? Status { get; internal set; }

    public virtual Team? Team { get; internal set; }

    public static Invitation Create(int teamId, string email) => new() { TeamId = teamId, Email = email, Status = "Pending" };

    public void UpdateStatus(string status) => Status = status;
}
