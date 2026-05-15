using System;
using System.Collections.Generic;

namespace TaskGenie.Domain.Entities;

public class TaskRequiredSkill
{
    protected TaskRequiredSkill() { }

    public int Id { get; internal set; }

    public int? TaskId { get; internal set; }

    public int? SkillId { get; internal set; }

    public int? RequiredLevel { get; internal set; }

    public virtual Skill? Skill { get; internal set; }

    public virtual Task? Task { get; internal set; }

    public static TaskRequiredSkill Create(int taskId, int skillId, int requiredLevel = 1) => new()
    {
        TaskId = taskId,
        SkillId = skillId,
        RequiredLevel = requiredLevel
    };
}
