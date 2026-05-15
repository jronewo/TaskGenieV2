using System;
using System.Collections.Generic;

namespace TaskGenie.Domain.Entities;

public class UserSkill
{
    protected UserSkill() { }

    public int Id { get; internal set; }

    public int? UserId { get; internal set; }

    public int? SkillId { get; internal set; }

    public int? Level { get; internal set; }

    public virtual Skill? Skill { get; internal set; }

    public virtual User? User { get; internal set; }

    public static UserSkill Create(int userId, int skillId, int level) => new() { UserId = userId, SkillId = skillId, Level = level };

    public void UpdateLevel(int newLevel) => Level = newLevel;
}
