using System;
using System.Collections.Generic;

namespace TaskGenie.Domain.Entities;

public class Skill
{
    protected Skill() { }

    public int SkillId { get; internal set; }

    public string SkillName { get; internal set; } = null!;

    public bool IsActive { get; internal set; } = true;

    public virtual ICollection<TaskRequiredSkill> TaskRequiredSkills { get; internal set; } = new List<TaskRequiredSkill>();

    public virtual ICollection<UserSkill> UserSkills { get; internal set; } = new List<UserSkill>();

    public static Skill Create(string skillName) => new() { SkillName = skillName, IsActive = true };

    public void Rename(string skillName) => SkillName = skillName;

    public void Activate() => IsActive = true;

    public void Deactivate() => IsActive = false;
}
