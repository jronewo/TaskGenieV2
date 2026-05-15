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
}
