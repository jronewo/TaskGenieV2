using System;
using System.Collections.Generic;

namespace TaskGenie.Domain.Entities;

public class User
{
    protected User() { }

    public int UserId { get; internal set; }

    public string Name { get; internal set; } = null!;

    public string Email { get; internal set; } = null!;

    public string Password { get; internal set; } = null!;

    public string? Avatar { get; internal set; }

    public string? Role { get; internal set; }

    public int? Status { get; internal set; }

    public DateTime? DeletedAt { get; internal set; }

    public DateTime? CreatedAt { get; internal set; }

    public DateTime? UpdatedAt { get; internal set; }

    /// <summary>"Free" or "Pro" — see <see cref="OrganizationPlans"/>. A personal plan, independent of
    /// any Organization the user may also own. Defaults to Free.</summary>
    public string Plan { get; internal set; } = OrganizationPlans.Free;

    /// <summary>When the current personal Pro period ends. Null while on the Free plan.</summary>
    public DateTime? PlanExpiresAt { get; internal set; }

    /// <summary>Remaining AI-feature usage credits for the current period (personal, not org-shared).</summary>
    public int AiQuota { get; internal set; } = Organization.DefaultFreeAiQuota;

    public virtual ICollection<AiRecommendation> AiRecommendations { get; internal set; } = new List<AiRecommendation>();

    public virtual ICollection<Evaluation> EvaluationLeaders { get; internal set; } = new List<Evaluation>();

    public virtual ICollection<Evaluation> EvaluationUsers { get; internal set; } = new List<Evaluation>();

    public virtual ICollection<TaskAssignee> TaskAssignees { get; internal set; } = new List<TaskAssignee>();

    public virtual ICollection<TaskComment> TaskComments { get; internal set; } = new List<TaskComment>();

    public virtual ICollection<Task> Tasks { get; internal set; } = new List<Task>();

    public virtual ICollection<TeamMember> TeamMembers { get; internal set; } = new List<TeamMember>();

    public virtual ICollection<Team> Teams { get; internal set; } = new List<Team>();

    public virtual ICollection<UserAvailability> UserAvailabilities { get; internal set; } = new List<UserAvailability>();

    public virtual ICollection<UserSkill> UserSkills { get; internal set; } = new List<UserSkill>();

    public virtual ICollection<Organization> Organizations { get; internal set; } = new List<Organization>();

    public virtual ICollection<ProjectEvaluation> ProjectEvaluations { get; internal set; } = new List<ProjectEvaluation>();

    public static User Create(string name, string email, string hashedPassword, string role = "NORMAL_USER", string? avatar = null)
        => new() { Name = name, Email = email, Password = hashedPassword, Role = role, Avatar = avatar, Status = 1, CreatedAt = DateTime.UtcNow };

    public void UpdateProfile(string? name, string? avatar)
    {
        if (!string.IsNullOrWhiteSpace(name)) Name = name;
        if (avatar != null) Avatar = avatar;
        UpdatedAt = DateTime.UtcNow;
    }

    public void ChangePassword(string hashedPassword)
    {
        Password = hashedPassword;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Applies a successful personal "upgrade to Pro" payment. Mirrors <see cref="Organization.UpgradeToPro"/>:
    /// if already Pro and still within the current period, the new period stacks on top instead of
    /// overwriting, so renewing early never loses paid-for time.
    /// </summary>
    public void UpgradeToPro(TimeSpan duration)
    {
        var baseline = Plan == OrganizationPlans.Pro && PlanExpiresAt is { } current && current > DateTime.UtcNow
            ? current
            : DateTime.UtcNow;

        Plan = OrganizationPlans.Pro;
        PlanExpiresAt = baseline.Add(duration);
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Called by a scheduled job once <see cref="PlanExpiresAt"/> has passed.</summary>
    public void DowngradeToFree()
    {
        Plan = OrganizationPlans.Free;
        PlanExpiresAt = null;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Applies a successful personal AI-quota top-up payment.</summary>
    public void AddAiQuota(int amount)
    {
        if (amount <= 0) return;
        AiQuota += amount;
        UpdatedAt = DateTime.UtcNow;
    }
}
