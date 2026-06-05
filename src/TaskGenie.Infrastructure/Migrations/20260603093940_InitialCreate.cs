using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaskGenie.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "activity_logs",
                columns: table => new
                {
                    log_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    user_id = table.Column<int>(type: "int", nullable: true),
                    action = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    entity_type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    entity_id = table.Column<int>(type: "int", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "(getdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__activity__9E2397E0EE5103A4", x => x.log_id);
                });

            migrationBuilder.CreateTable(
                name: "skills",
                columns: table => new
                {
                    skill_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    skill_name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__skills__FBBA837902EF6DE9", x => x.skill_id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    user_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    name = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    email = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    password = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    avatar = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    role = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true, defaultValue: "NORMAL_USER"),
                    status = table.Column<int>(type: "int", nullable: true, defaultValue: 1),
                    deleted_at = table.Column<DateTime>(type: "datetime", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "(getdate())"),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__users__B9BE370FA9E917F7", x => x.user_id);
                });

            migrationBuilder.CreateTable(
                name: "evaluations",
                columns: table => new
                {
                    evaluation_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    user_id = table.Column<int>(type: "int", nullable: true),
                    leader_id = table.Column<int>(type: "int", nullable: true),
                    skill_score = table.Column<int>(type: "int", nullable: true),
                    teamwork_score = table.Column<int>(type: "int", nullable: true),
                    communication_score = table.Column<int>(type: "int", nullable: true),
                    deadline_score = table.Column<int>(type: "int", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "(getdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__evaluati__827C592DBCF1FB91", x => x.evaluation_id);
                    table.ForeignKey(
                        name: "FK__evaluatio__leade__4CA06362",
                        column: x => x.leader_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "FK__evaluatio__user___4BAC3F29",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "notifications",
                columns: table => new
                {
                    notification_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    user_id = table.Column<int>(type: "int", nullable: true),
                    type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    title = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    message = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    reference_id = table.Column<int>(type: "int", nullable: true),
                    reference_type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    is_read = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "(getdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notifications", x => x.notification_id);
                    table.ForeignKey(
                        name: "FK_notifications_users",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "organizations",
                columns: table => new
                {
                    organization_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    name = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    logo = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    owner_id = table.Column<int>(type: "int", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "(getdate())"),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_organizations", x => x.organization_id);
                    table.ForeignKey(
                        name: "FK_organizations_users",
                        column: x => x.owner_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "teams",
                columns: table => new
                {
                    team_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    name = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_by = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__teams__F82DEDBCF1BFE95F", x => x.team_id);
                    table.ForeignKey(
                        name: "FK__teams__created_b__5070F446",
                        column: x => x.created_by,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "user_availability",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    user_id = table.Column<int>(type: "int", nullable: true),
                    day_of_week = table.Column<int>(type: "int", nullable: true),
                    available_hours = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__user_ava__3213E83FAD6E302D", x => x.id);
                    table.ForeignKey(
                        name: "FK__user_avai__user___48CFD27E",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "user_skills",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    user_id = table.Column<int>(type: "int", nullable: true),
                    skill_id = table.Column<int>(type: "int", nullable: true),
                    level = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__user_ski__3213E83FF7FE70DE", x => x.id);
                    table.ForeignKey(
                        name: "FK__user_skil__skill__44FF419A",
                        column: x => x.skill_id,
                        principalTable: "skills",
                        principalColumn: "skill_id");
                    table.ForeignKey(
                        name: "FK__user_skil__user___440B1D61",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "invitations",
                columns: table => new
                {
                    invitation_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    team_id = table.Column<int>(type: "int", nullable: true),
                    email = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__invitati__94B74D7C938D73DA", x => x.invitation_id);
                    table.ForeignKey(
                        name: "FK__invitatio__team___5812160E",
                        column: x => x.team_id,
                        principalTable: "teams",
                        principalColumn: "team_id");
                });

            migrationBuilder.CreateTable(
                name: "projects",
                columns: table => new
                {
                    project_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    team_id = table.Column<int>(type: "int", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    name = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    deadline = table.Column<DateOnly>(type: "date", nullable: true),
                    organization_id = table.Column<int>(type: "int", nullable: true),
                    progress = table.Column<int>(type: "int", nullable: true, defaultValue: 0),
                    predicted_end_date = table.Column<DateOnly>(type: "date", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "(getdate())"),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: true),
                    CreatedByNavigationUserId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__projects__BC799E1F9E7CEF3B", x => x.project_id);
                    table.ForeignKey(
                        name: "FK__projects__team_i__6E01572D",
                        column: x => x.team_id,
                        principalTable: "teams",
                        principalColumn: "team_id");
                    table.ForeignKey(
                        name: "FK_projects_organizations",
                        column: x => x.organization_id,
                        principalTable: "organizations",
                        principalColumn: "organization_id");
                    table.ForeignKey(
                        name: "FK_projects_users_CreatedByNavigationUserId",
                        column: x => x.CreatedByNavigationUserId,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "team_members",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    team_id = table.Column<int>(type: "int", nullable: true),
                    user_id = table.Column<int>(type: "int", nullable: true),
                    role = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__team_mem__3213E83FA2B300EE", x => x.id);
                    table.ForeignKey(
                        name: "FK__team_memb__team___5441852A",
                        column: x => x.team_id,
                        principalTable: "teams",
                        principalColumn: "team_id");
                    table.ForeignKey(
                        name: "FK__team_memb__user___5535A963",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "project_evaluations",
                columns: table => new
                {
                    evaluation_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    project_id = table.Column<int>(type: "int", nullable: false),
                    evaluator_id = table.Column<int>(type: "int", nullable: false),
                    overall_score = table.Column<int>(type: "int", nullable: true),
                    quality_score = table.Column<int>(type: "int", nullable: true),
                    timeliness_score = table.Column<int>(type: "int", nullable: true),
                    communication_score = table.Column<int>(type: "int", nullable: true),
                    comment = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "(getdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_project_evaluations", x => x.evaluation_id);
                    table.ForeignKey(
                        name: "FK_project_evaluations_projects",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "project_id");
                    table.ForeignKey(
                        name: "FK_project_evaluations_users",
                        column: x => x.evaluator_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "tasks",
                columns: table => new
                {
                    task_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    project_id = table.Column<int>(type: "int", nullable: true),
                    title = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    priority = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    deadline = table.Column<DateOnly>(type: "date", nullable: true),
                    estimated_time = table.Column<int>(type: "int", nullable: true),
                    ai_estimated_time = table.Column<int>(type: "int", nullable: true),
                    actual_time = table.Column<int>(type: "int", nullable: true),
                    difficulty = table.Column<int>(type: "int", nullable: true),
                    created_by = table.Column<int>(type: "int", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "(getdate())"),
                    version = table.Column<int>(type: "int", nullable: true, defaultValue: 1),
                    progress = table.Column<int>(type: "int", nullable: true, defaultValue: 0),
                    risk_level = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    ai_summary = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__tasks__0492148D776260FB", x => x.task_id);
                    table.ForeignKey(
                        name: "FK__tasks__created_b__5EBF139D",
                        column: x => x.created_by,
                        principalTable: "users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "FK__tasks__project_i__5DCAEF64",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "project_id");
                });

            migrationBuilder.CreateTable(
                name: "ai_analysis",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    task_id = table.Column<int>(type: "int", nullable: true),
                    analysis_type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    content = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "(getdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__ai_analy__3214EC0789A501F9", x => x.id);
                    table.ForeignKey(
                        name: "FK_ai_analysis_tasks",
                        column: x => x.task_id,
                        principalTable: "tasks",
                        principalColumn: "task_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ai_recommendations",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    task_id = table.Column<int>(type: "int", nullable: true),
                    suggested_user_id = table.Column<int>(type: "int", nullable: true),
                    score = table.Column<double>(type: "float", nullable: true),
                    reason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    recommendation_type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true, defaultValue: "assign")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__ai_recom__3213E83FF227C486", x => x.id);
                    table.ForeignKey(
                        name: "FK__ai_recomm__sugge__71D1E811",
                        column: x => x.suggested_user_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "FK__ai_recomm__task___70DDC3D8",
                        column: x => x.task_id,
                        principalTable: "tasks",
                        principalColumn: "task_id");
                });

            migrationBuilder.CreateTable(
                name: "task_assignees",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    task_id = table.Column<int>(type: "int", nullable: true),
                    user_id = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__task_ass__3213E83F508CE41A", x => x.id);
                    table.ForeignKey(
                        name: "FK__task_assi__task___693CA210",
                        column: x => x.task_id,
                        principalTable: "tasks",
                        principalColumn: "task_id");
                    table.ForeignKey(
                        name: "FK__task_assi__user___6A30C649",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "task_comments",
                columns: table => new
                {
                    comment_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    task_id = table.Column<int>(type: "int", nullable: true),
                    user_id = table.Column<int>(type: "int", nullable: true),
                    content = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__task_com__E795768799D9D2A0", x => x.comment_id);
                    table.ForeignKey(
                        name: "FK__task_comm__task___6D0D32F4",
                        column: x => x.task_id,
                        principalTable: "tasks",
                        principalColumn: "task_id");
                    table.ForeignKey(
                        name: "FK__task_comm__user___6E01572D",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "task_dependencies",
                columns: table => new
                {
                    dependency_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    task_id = table.Column<int>(type: "int", nullable: false),
                    depends_on_task_id = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_task_dependencies", x => x.dependency_id);
                    table.ForeignKey(
                        name: "FK_task_dependencies_depends_on_task",
                        column: x => x.depends_on_task_id,
                        principalTable: "tasks",
                        principalColumn: "task_id");
                    table.ForeignKey(
                        name: "FK_task_dependencies_task",
                        column: x => x.task_id,
                        principalTable: "tasks",
                        principalColumn: "task_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "task_embeddings",
                columns: table => new
                {
                    task_id = table.Column<int>(type: "int", nullable: false),
                    embedding = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "(getdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__task_emb__0492148DABF2B4CD", x => x.task_id);
                    table.ForeignKey(
                        name: "FK_task_embeddings_tasks",
                        column: x => x.task_id,
                        principalTable: "tasks",
                        principalColumn: "task_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "task_logs",
                columns: table => new
                {
                    log_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    task_id = table.Column<int>(type: "int", nullable: true),
                    progress = table.Column<int>(type: "int", nullable: true),
                    note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Risk = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "(getdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__task_log__9E2397E0AC4592A4", x => x.log_id);
                    table.ForeignKey(
                        name: "FK_task_logs_tasks",
                        column: x => x.task_id,
                        principalTable: "tasks",
                        principalColumn: "task_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TaskRequiredSkill",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TaskId = table.Column<int>(type: "int", nullable: true),
                    SkillId = table.Column<int>(type: "int", nullable: true),
                    RequiredLevel = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskRequiredSkill", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TaskRequiredSkill_skills",
                        column: x => x.SkillId,
                        principalTable: "skills",
                        principalColumn: "skill_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TaskRequiredSkill_tasks",
                        column: x => x.TaskId,
                        principalTable: "tasks",
                        principalColumn: "task_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ai_analysis_task_id",
                table: "ai_analysis",
                column: "task_id");

            migrationBuilder.CreateIndex(
                name: "IX_ai_recommendations_suggested_user_id",
                table: "ai_recommendations",
                column: "suggested_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_ai_recommendations_task_id",
                table: "ai_recommendations",
                column: "task_id");

            migrationBuilder.CreateIndex(
                name: "IX_evaluations_leader_id",
                table: "evaluations",
                column: "leader_id");

            migrationBuilder.CreateIndex(
                name: "IX_evaluations_user_id",
                table: "evaluations",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_invitations_team_id",
                table: "invitations",
                column: "team_id");

            migrationBuilder.CreateIndex(
                name: "IX_notifications_user_id",
                table: "notifications",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_organizations_owner_id",
                table: "organizations",
                column: "owner_id");

            migrationBuilder.CreateIndex(
                name: "IX_project_evaluations_evaluator_id",
                table: "project_evaluations",
                column: "evaluator_id");

            migrationBuilder.CreateIndex(
                name: "IX_project_evaluations_project_id",
                table: "project_evaluations",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "IX_projects_CreatedByNavigationUserId",
                table: "projects",
                column: "CreatedByNavigationUserId");

            migrationBuilder.CreateIndex(
                name: "IX_projects_organization_id",
                table: "projects",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_projects_team_id",
                table: "projects",
                column: "team_id");

            migrationBuilder.CreateIndex(
                name: "UQ__skills__73C038AD12806053",
                table: "skills",
                column: "skill_name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_task_assignees_user_id",
                table: "task_assignees",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "UQ__task_ass__EF09F7FCB797C73F",
                table: "task_assignees",
                columns: new[] { "task_id", "user_id" },
                unique: true,
                filter: "[task_id] IS NOT NULL AND [user_id] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_task_comments_task_id",
                table: "task_comments",
                column: "task_id");

            migrationBuilder.CreateIndex(
                name: "IX_task_comments_user_id",
                table: "task_comments",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_task_dependencies_depends_on_task_id",
                table: "task_dependencies",
                column: "depends_on_task_id");

            migrationBuilder.CreateIndex(
                name: "IX_task_dependencies_task_id",
                table: "task_dependencies",
                column: "task_id");

            migrationBuilder.CreateIndex(
                name: "IX_task_logs_task_id",
                table: "task_logs",
                column: "task_id");

            migrationBuilder.CreateIndex(
                name: "IX_TaskRequiredSkill_SkillId",
                table: "TaskRequiredSkill",
                column: "SkillId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskRequiredSkill_TaskId",
                table: "TaskRequiredSkill",
                column: "TaskId");

            migrationBuilder.CreateIndex(
                name: "IX_tasks_created_by",
                table: "tasks",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_tasks_project_id",
                table: "tasks",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "IX_team_members_user_id",
                table: "team_members",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "UQ__team_mem__13B60ECD7B0D1141",
                table: "team_members",
                columns: new[] { "team_id", "user_id" },
                unique: true,
                filter: "[team_id] IS NOT NULL AND [user_id] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_teams_created_by",
                table: "teams",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_user_availability_user_id",
                table: "user_availability",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_skills_skill_id",
                table: "user_skills",
                column: "skill_id");

            migrationBuilder.CreateIndex(
                name: "UQ__user_ski__36059F39B938ADFF",
                table: "user_skills",
                columns: new[] { "user_id", "skill_id" },
                unique: true,
                filter: "[user_id] IS NOT NULL AND [skill_id] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "UQ__users__AB6E616414D1BC50",
                table: "users",
                column: "email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "activity_logs");

            migrationBuilder.DropTable(
                name: "ai_analysis");

            migrationBuilder.DropTable(
                name: "ai_recommendations");

            migrationBuilder.DropTable(
                name: "evaluations");

            migrationBuilder.DropTable(
                name: "invitations");

            migrationBuilder.DropTable(
                name: "notifications");

            migrationBuilder.DropTable(
                name: "project_evaluations");

            migrationBuilder.DropTable(
                name: "task_assignees");

            migrationBuilder.DropTable(
                name: "task_comments");

            migrationBuilder.DropTable(
                name: "task_dependencies");

            migrationBuilder.DropTable(
                name: "task_embeddings");

            migrationBuilder.DropTable(
                name: "task_logs");

            migrationBuilder.DropTable(
                name: "TaskRequiredSkill");

            migrationBuilder.DropTable(
                name: "team_members");

            migrationBuilder.DropTable(
                name: "user_availability");

            migrationBuilder.DropTable(
                name: "user_skills");

            migrationBuilder.DropTable(
                name: "tasks");

            migrationBuilder.DropTable(
                name: "skills");

            migrationBuilder.DropTable(
                name: "projects");

            migrationBuilder.DropTable(
                name: "teams");

            migrationBuilder.DropTable(
                name: "organizations");

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}
