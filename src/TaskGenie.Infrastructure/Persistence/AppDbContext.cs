using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Infrastructure.Persistence;

public partial class AppDbContext : DbContext
{
    public AppDbContext()
    {
    }

    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<ActivityLog> ActivityLogs { get; set; }

    public virtual DbSet<AiAnalysis> AiAnalyses { get; set; }

    public virtual DbSet<AiRecommendation> AiRecommendations { get; set; }

    public virtual DbSet<Evaluation> Evaluations { get; set; }

    public virtual DbSet<Invitation> Invitations { get; set; }

    public virtual DbSet<Project> Projects { get; set; }

    public virtual DbSet<ProjectEvaluation> ProjectEvaluations { get; set; }

    public virtual DbSet<Organization> Organizations { get; set; }

    public virtual DbSet<Skill> Skills { get; set; }

    public virtual DbSet<TaskEntity> Tasks { get; set; }

    public virtual DbSet<TaskAssignee> TaskAssignees { get; set; }

    public virtual DbSet<TaskComment> TaskComments { get; set; }

    public virtual DbSet<TaskEmbedding> TaskEmbeddings { get; set; }

    public virtual DbSet<TaskLog> TaskLogs { get; set; }

    public virtual DbSet<TaskDependency> TaskDependencies { get; set; }

    public virtual DbSet<TaskRequiredSkill> TaskRequiredSkills { get; set; }

    public virtual DbSet<Team> Teams { get; set; }

    public virtual DbSet<TeamMember> TeamMembers { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<UserAvailability> UserAvailabilities { get; set; }

    public virtual DbSet<UserSkill> UserSkills { get; set; }

    public virtual DbSet<Notification> Notifications { get; set; }

    public virtual DbSet<UserScore> UserScores { get; set; }

    public virtual DbSet<Meeting> Meetings { get; set; }

    public virtual DbSet<MeetingAttendee> MeetingAttendees { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ActivityLog>(entity =>
        {
            entity.HasKey(e => e.LogId).HasName("PK__activity__9E2397E0EE5103A4");

            entity.ToTable("activity_logs");

            entity.Property(e => e.LogId).HasColumnName("log_id");
            entity.Property(e => e.Action).HasColumnName("action");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.EntityId).HasColumnName("entity_id");
            entity.Property(e => e.EntityType)
                .HasMaxLength(50)
                .HasColumnName("entity_type");
            entity.Property(e => e.UserId).HasColumnName("user_id");
        });

        modelBuilder.Entity<AiAnalysis>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__ai_analy__3214EC0789A501F9");

            entity.ToTable("ai_analysis");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AnalysisType)
                .HasMaxLength(50)
                .HasColumnName("analysis_type");
            entity.Property(e => e.Content).HasColumnName("content");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.TaskId).HasColumnName("task_id");

            entity.HasOne(d => d.Task).WithMany(p => p.AiAnalyses)
                .HasForeignKey(d => d.TaskId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_ai_analysis_tasks");
        });

        modelBuilder.Entity<AiRecommendation>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__ai_recom__3213E83FF227C486");

            entity.ToTable("ai_recommendations");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Reason).HasColumnName("reason");
            entity.Property(e => e.RecommendationType)
                .HasMaxLength(50)
                .HasDefaultValue("assign")
                .HasColumnName("recommendation_type");
            entity.Property(e => e.Score).HasColumnName("score");
            entity.Property(e => e.SuggestedUserId).HasColumnName("suggested_user_id");
            entity.Property(e => e.TaskId).HasColumnName("task_id");

            entity.HasOne(d => d.SuggestedUser).WithMany(p => p.AiRecommendations)
                .HasForeignKey(d => d.SuggestedUserId)
                .HasConstraintName("FK__ai_recomm__sugge__71D1E811");

            entity.HasOne(d => d.Task).WithMany(p => p.AiRecommendations)
                .HasForeignKey(d => d.TaskId)
                .HasConstraintName("FK__ai_recomm__task___70DDC3D8");
        });

        modelBuilder.Entity<Evaluation>(entity =>
        {
            entity.HasKey(e => e.EvaluationId).HasName("PK__evaluati__827C592DBCF1FB91");

            entity.ToTable("evaluations");

            entity.Property(e => e.EvaluationId).HasColumnName("evaluation_id");
            entity.Property(e => e.CommunicationScore).HasColumnName("communication_score");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.DeadlineScore).HasColumnName("deadline_score");
            entity.Property(e => e.LeaderId).HasColumnName("leader_id");
            entity.Property(e => e.SkillScore).HasColumnName("skill_score");
            entity.Property(e => e.TeamworkScore).HasColumnName("teamwork_score");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Leader).WithMany(p => p.EvaluationLeaders)
                .HasForeignKey(d => d.LeaderId)
                .HasConstraintName("FK__evaluatio__leade__4CA06362");

            entity.HasOne(d => d.User).WithMany(p => p.EvaluationUsers)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK__evaluatio__user___4BAC3F29");
        });

        modelBuilder.Entity<Invitation>(entity =>
        {
            entity.HasKey(e => e.InvitationId).HasName("PK__invitati__94B74D7C938D73DA");

            entity.ToTable("invitations");

            entity.Property(e => e.InvitationId).HasColumnName("invitation_id");
            entity.Property(e => e.Email)
                .HasMaxLength(255)
                .HasColumnName("email");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasColumnName("status");
            entity.Property(e => e.TeamId).HasColumnName("team_id");

            entity.HasOne(d => d.Team).WithMany(p => p.Invitations)
                .HasForeignKey(d => d.TeamId)
                .HasConstraintName("FK__invitatio__team___5812160E");
        });

        modelBuilder.Entity<Organization>(entity =>
        {
            entity.HasKey(e => e.OrganizationId).HasName("PK_organizations");

            entity.ToTable("organizations");

            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Logo)
                .HasMaxLength(500)
                .HasColumnName("logo");
            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .HasColumnName("name");
            entity.Property(e => e.OwnerId).HasColumnName("owner_id");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Owner).WithMany(p => p.Organizations)
                .HasForeignKey(d => d.OwnerId)
                .HasConstraintName("FK_organizations_users");
        });

        modelBuilder.Entity<ProjectEvaluation>(entity =>
        {
            entity.HasKey(e => e.EvaluationId).HasName("PK_project_evaluations");

            entity.ToTable("project_evaluations");

            entity.Property(e => e.EvaluationId).HasColumnName("evaluation_id");
            entity.Property(e => e.Comment).HasColumnName("comment");
            entity.Property(e => e.CommunicationScore).HasColumnName("communication_score");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.EvaluatorId).HasColumnName("evaluator_id");
            entity.Property(e => e.OverallScore).HasColumnName("overall_score");
            entity.Property(e => e.ProjectId).HasColumnName("project_id");
            entity.Property(e => e.QualityScore).HasColumnName("quality_score");
            entity.Property(e => e.TimelinessScore).HasColumnName("timeliness_score");

            entity.HasOne(d => d.Evaluator).WithMany(p => p.ProjectEvaluations)
                .HasForeignKey(d => d.EvaluatorId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_project_evaluations_users");

            entity.HasOne(d => d.Project).WithMany(p => p.ProjectEvaluations)
                .HasForeignKey(d => d.ProjectId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_project_evaluations_projects");
        });

        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(e => e.ProjectId).HasName("PK__projects__BC799E1F9E7CEF3B");

            entity.ToTable("projects");

            entity.Property(e => e.ProjectId).HasColumnName("project_id");
            entity.Property(e => e.Deadline).HasColumnName("deadline");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .HasColumnName("name");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasColumnName("status");
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.Property(e => e.Progress)
                .HasDefaultValue(0)
                .HasColumnName("progress");
            entity.Property(e => e.PredictedEndDate).HasColumnName("predicted_end_date");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("datetime")
                .HasColumnName("updated_at");
            entity.Property(e => e.TeamId).HasColumnName("team_id");

            entity.HasOne(d => d.Team).WithMany(p => p.Projects)
                .HasForeignKey(d => d.TeamId)
                .HasConstraintName("FK__projects__team_i__6E01572D");

            entity.HasOne(d => d.Organization).WithMany(p => p.Projects)
                .HasForeignKey(d => d.OrganizationId)
                .HasConstraintName("FK_projects_organizations");
        });

        modelBuilder.Entity<Skill>(entity =>
        {
            entity.HasKey(e => e.SkillId).HasName("PK__skills__FBBA837902EF6DE9");

            entity.ToTable("skills");

            entity.HasIndex(e => e.SkillName, "UQ__skills__73C038AD12806053").IsUnique();

            entity.Property(e => e.SkillId).HasColumnName("skill_id");
            entity.Property(e => e.SkillName)
                .HasMaxLength(100)
                .HasColumnName("skill_name");
        });

        modelBuilder.Entity<TaskEntity>(entity =>
        {
            entity.HasKey(e => e.TaskId).HasName("PK__tasks__0492148D776260FB");

            entity.ToTable("tasks", tb => tb.HasTrigger("trg_task_update"));

            entity.Property(e => e.TaskId).HasColumnName("task_id");
            entity.Property(e => e.AiSummary).HasColumnName("ai_summary");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.Deadline).HasColumnName("deadline");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Difficulty).HasColumnName("difficulty");
            entity.Property(e => e.EstimatedTime).HasColumnName("estimated_time");
            entity.Property(e => e.AiEstimatedTime).HasColumnName("ai_estimated_time");
            entity.Property(e => e.ActualTime).HasColumnName("actual_time");
            entity.Property(e => e.Priority)
                .HasMaxLength(10)
                .HasColumnName("priority");
            entity.Property(e => e.Progress)
                .HasDefaultValue(0)
                .HasColumnName("progress");
            entity.Property(e => e.ProjectId).HasColumnName("project_id");
            entity.Property(e => e.RiskLevel)
                .HasMaxLength(20)
                .HasColumnName("risk_level");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasColumnName("status");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasColumnName("title");
            entity.Property(e => e.Version)
                .HasDefaultValue(1)
                .HasColumnName("version");
            entity.Property(e => e.CompletedAt)
                .HasColumnType("datetime")
                .HasColumnName("completed_at");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.Tasks)
                .HasForeignKey(d => d.CreatedBy)
                .HasConstraintName("FK__tasks__created_b__5EBF139D");

            entity.HasOne(d => d.Project).WithMany(p => p.Tasks)
                .HasForeignKey(d => d.ProjectId)
                .HasConstraintName("FK__tasks__project_i__5DCAEF64");
        });

        modelBuilder.Entity<TaskAssignee>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__task_ass__3213E83F508CE41A");

            entity.ToTable("task_assignees");

            entity.HasIndex(e => new { e.TaskId, e.UserId }, "UQ__task_ass__EF09F7FCB797C73F").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TaskId).HasColumnName("task_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Task).WithMany(p => p.TaskAssignees)
                .HasForeignKey(d => d.TaskId)
                .HasConstraintName("FK__task_assi__task___693CA210");

            entity.HasOne(d => d.User).WithMany(p => p.TaskAssignees)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK__task_assi__user___6A30C649");
        });

        modelBuilder.Entity<TaskComment>(entity =>
        {
            entity.HasKey(e => e.CommentId).HasName("PK__task_com__E795768799D9D2A0");

            entity.ToTable("task_comments");

            entity.Property(e => e.CommentId).HasColumnName("comment_id");
            entity.Property(e => e.Content).HasColumnName("content");
            entity.Property(e => e.TaskId).HasColumnName("task_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Task).WithMany(p => p.TaskComments)
                .HasForeignKey(d => d.TaskId)
                .HasConstraintName("FK__task_comm__task___6D0D32F4");

            entity.HasOne(d => d.User).WithMany(p => p.TaskComments)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK__task_comm__user___6E01572D");
        });

        modelBuilder.Entity<TaskDependency>(entity =>
        {
            entity.HasKey(e => e.DependencyId).HasName("PK_task_dependencies");

            entity.ToTable("task_dependencies");

            entity.Property(e => e.DependencyId).HasColumnName("dependency_id");
            entity.Property(e => e.TaskId).HasColumnName("task_id");
            entity.Property(e => e.DependsOnTaskId).HasColumnName("depends_on_task_id");

            entity.HasOne(d => d.Task).WithMany(p => p.TaskDependencies)
                .HasForeignKey(d => d.TaskId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_task_dependencies_task");

            entity.HasOne(d => d.DependsOnTask).WithMany(p => p.DependentOnTasks)
                .HasForeignKey(d => d.DependsOnTaskId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_task_dependencies_depends_on_task");
        });

        modelBuilder.Entity<TaskEmbedding>(entity =>
        {
            entity.HasKey(e => e.TaskId).HasName("PK__task_emb__0492148DABF2B4CD");

            entity.ToTable("task_embeddings");

            entity.Property(e => e.TaskId)
                .ValueGeneratedNever()
                .HasColumnName("task_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Embedding).HasColumnName("embedding");

            entity.HasOne(d => d.Task).WithOne(p => p.TaskEmbedding)
                .HasForeignKey<TaskEmbedding>(d => d.TaskId)
                .HasConstraintName("FK_task_embeddings_tasks");
        });

        modelBuilder.Entity<TaskLog>(entity =>
        {
            entity.HasKey(e => e.LogId).HasName("PK__task_log__9E2397E0AC4592A4");

            entity.ToTable("task_logs");

            entity.Property(e => e.LogId).HasColumnName("log_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Note).HasColumnName("note");
            entity.Property(e => e.Progress).HasColumnName("progress");
            entity.Property(e => e.TaskId).HasColumnName("task_id");

            entity.HasOne(d => d.Task).WithMany(p => p.TaskLogs)
                .HasForeignKey(d => d.TaskId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_task_logs_tasks");
        });

        modelBuilder.Entity<TaskRequiredSkill>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.ToTable("TaskRequiredSkill");

            entity.Property(e => e.Id).HasColumnName("Id");
            entity.Property(e => e.TaskId).HasColumnName("TaskId");
            entity.Property(e => e.SkillId).HasColumnName("SkillId");
            entity.Property(e => e.RequiredLevel).HasColumnName("RequiredLevel");

            entity.HasOne(d => d.Task).WithMany(p => p.TaskRequiredSkills)
                .HasForeignKey(d => d.TaskId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_TaskRequiredSkill_tasks");

            entity.HasOne(d => d.Skill).WithMany(p => p.TaskRequiredSkills)
                .HasForeignKey(d => d.SkillId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_TaskRequiredSkill_skills");
        });

        modelBuilder.Entity<Team>(entity =>
        {
            entity.HasKey(e => e.TeamId).HasName("PK__teams__F82DEDBCF1BFE95F");

            entity.ToTable("teams");

            entity.Property(e => e.TeamId).HasColumnName("team_id");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .HasColumnName("name");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.Teams)
                .HasForeignKey(d => d.CreatedBy)
                .HasConstraintName("FK__teams__created_b__5070F446");
        });

        modelBuilder.Entity<TeamMember>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__team_mem__3213E83FA2B300EE");

            entity.ToTable("team_members");

            entity.HasIndex(e => new { e.TeamId, e.UserId }, "UQ__team_mem__13B60ECD7B0D1141").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Role)
                .HasMaxLength(20)
                .HasColumnName("role");
            entity.Property(e => e.TeamId).HasColumnName("team_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Team).WithMany(p => p.TeamMembers)
                .HasForeignKey(d => d.TeamId)
                .HasConstraintName("FK__team_memb__team___5441852A");

            entity.HasOne(d => d.User).WithMany(p => p.TeamMembers)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK__team_memb__user___5535A963");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PK__users__B9BE370FA9E917F7");

            entity.ToTable("users", tb => tb.HasTrigger("trg_user_status"));

            entity.HasIndex(e => e.Email, "UQ__users__AB6E616414D1BC50").IsUnique();

            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Avatar).HasColumnName("avatar");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.DeletedAt)
                .HasColumnType("datetime")
                .HasColumnName("deleted_at");
            entity.Property(e => e.Email)
                .HasMaxLength(255)
                .HasColumnName("email");
            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .HasColumnName("name");
            entity.Property(e => e.Password).HasColumnName("password");
            entity.Property(e => e.Role)
                .HasMaxLength(20)
                .HasDefaultValue("NORMAL_USER")
                .HasColumnName("role");
            entity.Property(e => e.Status)
                .HasDefaultValue(1)
                .HasColumnName("status");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("datetime")
                .HasColumnName("updated_at");
        });

        modelBuilder.Entity<UserAvailability>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__user_ava__3213E83FAD6E302D");

            entity.ToTable("user_availability");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AvailableHours).HasColumnName("available_hours");
            entity.Property(e => e.DayOfWeek).HasColumnName("day_of_week");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.UserAvailabilities)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK__user_avai__user___48CFD27E");
        });

        modelBuilder.Entity<UserSkill>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__user_ski__3213E83FF7FE70DE");

            entity.ToTable("user_skills");

            entity.HasIndex(e => new { e.UserId, e.SkillId }, "UQ__user_ski__36059F39B938ADFF").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Level).HasColumnName("level");
            entity.Property(e => e.SkillId).HasColumnName("skill_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Skill).WithMany(p => p.UserSkills)
                .HasForeignKey(d => d.SkillId)
                .HasConstraintName("FK__user_skil__skill__44FF419A");

            entity.HasOne(d => d.User).WithMany(p => p.UserSkills)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK__user_skil__user___440B1D61");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.NotificationId).HasName("PK_notifications");

            entity.ToTable("notifications");

            entity.Property(e => e.NotificationId).HasColumnName("notification_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Type)
                .HasMaxLength(50)
                .HasColumnName("type");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasColumnName("title");
            entity.Property(e => e.Message).HasColumnName("message");
            entity.Property(e => e.ReferenceId).HasColumnName("reference_id");
            entity.Property(e => e.ReferenceType)
                .HasMaxLength(50)
                .HasColumnName("reference_type");
            entity.Property(e => e.IsRead)
                .HasDefaultValue(false)
                .HasColumnName("is_read");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("created_at");

            entity.HasOne(d => d.User).WithMany()
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_notifications_users");
        });

        modelBuilder.Entity<UserScore>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK_user_scores");
            entity.ToTable("user_scores");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.TaskId).HasColumnName("task_id");
            entity.Property(e => e.ProjectId).HasColumnName("project_id");
            entity.Property(e => e.Type)
                .HasMaxLength(50)
                .HasColumnName("type");
            entity.Property(e => e.Amount).HasColumnName("amount");
            entity.Property(e => e.Reason)
                .HasMaxLength(500)
                .HasColumnName("reason");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("created_at");

            entity.HasOne(e => e.User).WithMany()
                .HasForeignKey(e => e.UserId)
                .HasConstraintName("FK_user_scores_users");

            entity.HasOne(e => e.Task).WithMany()
                .HasForeignKey(e => e.TaskId)
                .IsRequired(false)
                .HasConstraintName("FK_user_scores_tasks");

            entity.HasOne(e => e.Project).WithMany()
                .HasForeignKey(e => e.ProjectId)
                .IsRequired(false)
                .HasConstraintName("FK_user_scores_projects");
        });

        modelBuilder.Entity<Meeting>(entity =>
        {
            entity.HasKey(e => e.MeetingId).HasName("PK_meetings");

            entity.ToTable("meetings");

            entity.Property(e => e.MeetingId).HasColumnName("meeting_id");
            entity.Property(e => e.ProjectId).HasColumnName("project_id");
            entity.Property(e => e.OrganizedBy).HasColumnName("organized_by");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasColumnName("title");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.ScheduledAt)
                .HasColumnType("datetime")
                .HasColumnName("scheduled_at");
            entity.Property(e => e.EndAt)
                .HasColumnType("datetime")
                .HasColumnName("end_at");
            entity.Property(e => e.Location)
                .HasMaxLength(500)
                .HasColumnName("location");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("Scheduled")
                .HasColumnName("status");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Project).WithMany()
                .HasForeignKey(d => d.ProjectId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_meetings_projects");

            entity.HasOne(d => d.Organizer).WithMany()
                .HasForeignKey(d => d.OrganizedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_meetings_users");
        });

        modelBuilder.Entity<MeetingAttendee>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK_meeting_attendees");

            entity.ToTable("meeting_attendees");

            entity.HasIndex(e => new { e.MeetingId, e.UserId }, "UQ_meeting_attendees").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.MeetingId).HasColumnName("meeting_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("Invited")
                .HasColumnName("status");

            entity.HasOne(d => d.Meeting).WithMany(p => p.Attendees)
                .HasForeignKey(d => d.MeetingId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_meeting_attendees_meetings");

            entity.HasOne(d => d.User).WithMany()
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_meeting_attendees_users");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
