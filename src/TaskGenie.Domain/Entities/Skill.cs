using System;
using System.Collections.Generic;

namespace TaskGenie.Domain.Entities;

public class Skill
{
    protected Skill() { }

    public int SkillId { get; internal set; }

    public string SkillName { get; internal set; } = null!;

    /// <summary>Archived skills stay referenced by existing TaskRequiredSkill/UserSkill rows but
    /// disappear from the catalog offered to users. Skills are never hard-deleted.</summary>
    public bool IsActive { get; internal set; } = true;

    public virtual ICollection<TaskRequiredSkill> TaskRequiredSkills { get; internal set; } = new List<TaskRequiredSkill>();

    public virtual ICollection<UserSkill> UserSkills { get; internal set; } = new List<UserSkill>();

    public static Skill Create(string skillName) => new() { SkillName = skillName, IsActive = true };

    public void Rename(string skillName) => SkillName = skillName;

    public void SetActive(bool isActive) => IsActive = isActive;
}
