using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaskGenie.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPlanFeaturesAndProjectRiskAutomation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "risk_automation_hour_utc",
                table: "projects",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "risk_automation_last_run_at",
                table: "projects",
                type: "datetime",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ai_chatbot_enabled",
                table: "plans",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "duration_days",
                table: "plans",
                type: "int",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "plans",
                keyColumn: "plan_id",
                keyValue: 1,
                column: "duration_days",
                value: null);

            migrationBuilder.UpdateData(
                table: "plans",
                keyColumn: "plan_id",
                keyValue: 2,
                columns: new[] { "ai_chatbot_enabled", "duration_days" },
                values: new object[] { true, null });

            migrationBuilder.UpdateData(
                table: "plans",
                keyColumn: "plan_id",
                keyValue: 3,
                columns: new[] { "duration_days", "is_active" },
                values: new object[] { null, false });

            migrationBuilder.UpdateData(
                table: "plans",
                keyColumn: "plan_id",
                keyValue: 4,
                columns: new[] { "ai_chatbot_enabled", "duration_days" },
                values: new object[] { true, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "risk_automation_hour_utc",
                table: "projects");

            migrationBuilder.DropColumn(
                name: "risk_automation_last_run_at",
                table: "projects");

            migrationBuilder.DropColumn(
                name: "ai_chatbot_enabled",
                table: "plans");

            migrationBuilder.DropColumn(
                name: "duration_days",
                table: "plans");

            migrationBuilder.UpdateData(
                table: "plans",
                keyColumn: "plan_id",
                keyValue: 3,
                column: "is_active",
                value: true);
        }
    }
}
