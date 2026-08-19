using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace TaskGenie.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddExplainableAiRiskAndEvidence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ai_recommendations_task_id",
                table: "ai_recommendations");

            migrationBuilder.AddColumn<DateTime>(
                name: "created_at",
                table: "ai_recommendations",
                type: "datetime",
                nullable: false,
                defaultValueSql: "(getdate())");

            migrationBuilder.AddColumn<DateTime>(
                name: "decided_at",
                table: "ai_recommendations",
                type: "datetime",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "decided_by",
                table: "ai_recommendations",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "model_version",
                table: "ai_recommendations",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "outcome",
                table: "ai_recommendations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "performance_score",
                table: "ai_recommendations",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<int>(
                name: "rank",
                table: "ai_recommendations",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "run_id",
                table: "ai_recommendations",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<double>(
                name: "semantic_similarity_score",
                table: "ai_recommendations",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "skill_match_score",
                table: "ai_recommendations",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<string>(
                name: "status",
                table: "ai_recommendations",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "GENERATED");

            migrationBuilder.AddColumn<double>(
                name: "workload_score",
                table: "ai_recommendations",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.CreateTable(
                name: "ai_execution_logs",
                columns: table => new
                {
                    ai_execution_log_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    run_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    task_id = table.Column<int>(type: "int", nullable: true),
                    feature = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    provider = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    model_version = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    input_snapshot = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    output_snapshot = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    latency_ms = table.Column<int>(type: "int", nullable: false),
                    error_message = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_execution_logs", x => x.ai_execution_log_id);
                    table.ForeignKey(
                        name: "FK_ai_execution_logs_tasks",
                        column: x => x.task_id,
                        principalTable: "tasks",
                        principalColumn: "task_id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "attachments",
                columns: table => new
                {
                    attachment_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    task_id = table.Column<int>(type: "int", nullable: false),
                    file_name = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    mime_type = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    storage_url = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: false),
                    storage_public_id = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    uploaded_by = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_attachments", x => x.attachment_id);
                    table.ForeignKey(
                        name: "FK_attachments_tasks",
                        column: x => x.task_id,
                        principalTable: "tasks",
                        principalColumn: "task_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_attachments_users",
                        column: x => x.uploaded_by,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "risk_rules",
                columns: table => new
                {
                    risk_rule_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    factor_type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    weight = table.Column<double>(type: "float", nullable: false),
                    description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    version = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    is_active = table.Column<bool>(type: "bit", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_risk_rules", x => x.risk_rule_id);
                });

            migrationBuilder.CreateTable(
                name: "risk_score_history",
                columns: table => new
                {
                    risk_score_history_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    run_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    task_id = table.Column<int>(type: "int", nullable: false),
                    project_id = table.Column<int>(type: "int", nullable: true),
                    total_score = table.Column<double>(type: "float", nullable: false),
                    risk_level = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    rule_version = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    calculation_mode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    explanation = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    mitigation_actions = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_risk_score_history", x => x.risk_score_history_id);
                    table.ForeignKey(
                        name: "FK_risk_score_history_projects",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "project_id");
                    table.ForeignKey(
                        name: "FK_risk_score_history_tasks",
                        column: x => x.task_id,
                        principalTable: "tasks",
                        principalColumn: "task_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "task_evidences",
                columns: table => new
                {
                    evidence_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    task_id = table.Column<int>(type: "int", nullable: false),
                    task_log_id = table.Column<int>(type: "int", nullable: true),
                    attachment_id = table.Column<int>(type: "int", nullable: true),
                    external_url = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: true),
                    evidence_type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    submitted_by = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_task_evidences", x => x.evidence_id);
                    table.ForeignKey(
                        name: "FK_task_evidences_attachments",
                        column: x => x.attachment_id,
                        principalTable: "attachments",
                        principalColumn: "attachment_id");
                    table.ForeignKey(
                        name: "FK_task_evidences_task_logs",
                        column: x => x.task_log_id,
                        principalTable: "task_logs",
                        principalColumn: "log_id");
                    table.ForeignKey(
                        name: "FK_task_evidences_tasks",
                        column: x => x.task_id,
                        principalTable: "tasks",
                        principalColumn: "task_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_task_evidences_users",
                        column: x => x.submitted_by,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "risk_factors",
                columns: table => new
                {
                    risk_factor_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    risk_score_history_id = table.Column<int>(type: "int", nullable: false),
                    risk_rule_id = table.Column<int>(type: "int", nullable: true),
                    factor_code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    raw_value = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    normalized_score = table.Column<double>(type: "float", nullable: false),
                    weight = table.Column<double>(type: "float", nullable: false),
                    contribution = table.Column<double>(type: "float", nullable: false),
                    evidence = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_risk_factors", x => x.risk_factor_id);
                    table.ForeignKey(
                        name: "FK_risk_factors_risk_rules",
                        column: x => x.risk_rule_id,
                        principalTable: "risk_rules",
                        principalColumn: "risk_rule_id");
                    table.ForeignKey(
                        name: "FK_risk_factors_risk_score_history",
                        column: x => x.risk_score_history_id,
                        principalTable: "risk_score_history",
                        principalColumn: "risk_score_history_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "risk_rules",
                columns: new[] { "risk_rule_id", "code", "created_at", "description", "factor_type", "is_active", "name", "version", "weight" },
                values: new object[,]
                {
                    { 1, "DEADLINE", new DateTime(2026, 7, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Deadline proximity and remaining effort.", "DEADLINE", true, "Deadline pressure", "risk-v1", 0.29999999999999999 },
                    { 2, "PROGRESS", new DateTime(2026, 7, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Expected versus actual progress.", "PROGRESS", true, "Progress variance", "risk-v1", 0.25 },
                    { 3, "DEPENDENCY", new DateTime(2026, 7, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Incomplete dependencies and reported blockers.", "DEPENDENCY", true, "Dependencies and blockers", "risk-v1", 0.20000000000000001 },
                    { 4, "WORKLOAD", new DateTime(2026, 7, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Active workload and declared capacity.", "WORKLOAD", true, "Assignee workload", "risk-v1", 0.14999999999999999 },
                    { 5, "HISTORICAL", new DateTime(2026, 7, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Historical deadline performance.", "HISTORICAL", true, "Historical delivery", "risk-v1", 0.10000000000000001 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_ai_recommendations_task_id_run_id_rank",
                table: "ai_recommendations",
                columns: new[] { "task_id", "run_id", "rank" });

            migrationBuilder.CreateIndex(
                name: "IX_ai_execution_logs_run_id",
                table: "ai_execution_logs",
                column: "run_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ai_execution_logs_task_id",
                table: "ai_execution_logs",
                column: "task_id");

            migrationBuilder.CreateIndex(
                name: "IX_attachments_task_id",
                table: "attachments",
                column: "task_id");

            migrationBuilder.CreateIndex(
                name: "IX_attachments_uploaded_by",
                table: "attachments",
                column: "uploaded_by");

            migrationBuilder.CreateIndex(
                name: "IX_risk_factors_risk_rule_id",
                table: "risk_factors",
                column: "risk_rule_id");

            migrationBuilder.CreateIndex(
                name: "IX_risk_factors_risk_score_history_id",
                table: "risk_factors",
                column: "risk_score_history_id");

            migrationBuilder.CreateIndex(
                name: "IX_risk_rules_code_version",
                table: "risk_rules",
                columns: new[] { "code", "version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_risk_score_history_project_id",
                table: "risk_score_history",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "IX_risk_score_history_run_id",
                table: "risk_score_history",
                column: "run_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_risk_score_history_task_id",
                table: "risk_score_history",
                column: "task_id");

            migrationBuilder.CreateIndex(
                name: "IX_task_evidences_attachment_id",
                table: "task_evidences",
                column: "attachment_id");

            migrationBuilder.CreateIndex(
                name: "IX_task_evidences_submitted_by",
                table: "task_evidences",
                column: "submitted_by");

            migrationBuilder.CreateIndex(
                name: "IX_task_evidences_task_id",
                table: "task_evidences",
                column: "task_id");

            migrationBuilder.CreateIndex(
                name: "IX_task_evidences_task_log_id",
                table: "task_evidences",
                column: "task_log_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ai_execution_logs");

            migrationBuilder.DropTable(
                name: "risk_factors");

            migrationBuilder.DropTable(
                name: "task_evidences");

            migrationBuilder.DropTable(
                name: "risk_rules");

            migrationBuilder.DropTable(
                name: "risk_score_history");

            migrationBuilder.DropTable(
                name: "attachments");

            migrationBuilder.DropIndex(
                name: "IX_ai_recommendations_task_id_run_id_rank",
                table: "ai_recommendations");

            migrationBuilder.DropColumn(
                name: "created_at",
                table: "ai_recommendations");

            migrationBuilder.DropColumn(
                name: "decided_at",
                table: "ai_recommendations");

            migrationBuilder.DropColumn(
                name: "decided_by",
                table: "ai_recommendations");

            migrationBuilder.DropColumn(
                name: "model_version",
                table: "ai_recommendations");

            migrationBuilder.DropColumn(
                name: "outcome",
                table: "ai_recommendations");

            migrationBuilder.DropColumn(
                name: "performance_score",
                table: "ai_recommendations");

            migrationBuilder.DropColumn(
                name: "rank",
                table: "ai_recommendations");

            migrationBuilder.DropColumn(
                name: "run_id",
                table: "ai_recommendations");

            migrationBuilder.DropColumn(
                name: "semantic_similarity_score",
                table: "ai_recommendations");

            migrationBuilder.DropColumn(
                name: "skill_match_score",
                table: "ai_recommendations");

            migrationBuilder.DropColumn(
                name: "status",
                table: "ai_recommendations");

            migrationBuilder.DropColumn(
                name: "workload_score",
                table: "ai_recommendations");

            migrationBuilder.CreateIndex(
                name: "IX_ai_recommendations_task_id",
                table: "ai_recommendations",
                column: "task_id");
        }
    }
}
