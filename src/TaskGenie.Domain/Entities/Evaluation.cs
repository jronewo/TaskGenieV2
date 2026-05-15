using System;
using System.Collections.Generic;

namespace TaskGenie.Domain.Entities;

public class Evaluation
{
    protected Evaluation() { }

    public int EvaluationId { get; internal set; }

    public int? UserId { get; internal set; }

    public int? LeaderId { get; internal set; }

    public int? SkillScore { get; internal set; }

    public int? TeamworkScore { get; internal set; }

    public int? CommunicationScore { get; internal set; }

    public int? DeadlineScore { get; internal set; }

    public DateTime? CreatedAt { get; internal set; }

    public virtual User? Leader { get; internal set; }

    public virtual User? User { get; internal set; }

    public static Evaluation Create(int userId, int leaderId, int? skillScore, int? teamworkScore, int? deadlineScore, int? communicationScore)
        => new() { UserId = userId, LeaderId = leaderId, SkillScore = skillScore, TeamworkScore = teamworkScore, DeadlineScore = deadlineScore, CommunicationScore = communicationScore, CreatedAt = DateTime.UtcNow };
}
