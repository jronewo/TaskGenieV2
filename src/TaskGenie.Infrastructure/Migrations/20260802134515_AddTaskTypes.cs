using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace TaskGenie.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTaskTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "task_type_id",
                table: "tasks",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "task_types",
                columns: table => new
                {
                    task_type_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    code = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    name = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    color_hex = table.Column<string>(type: "nvarchar(9)", maxLength: 9, nullable: true),
                    is_active = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_task_types", x => x.task_type_id);
                });

            migrationBuilder.InsertData(
                table: "task_types",
                columns: new[] { "task_type_id", "code", "color_hex", "is_active", "name" },
                values: new object[,]
                {
                    { 1, "DEVELOP", "#3B82F6", true, "Develop" },
                    { 2, "BUG", "#EF4444", true, "Bug" },
                    { 3, "TESTING", "#10B981", true, "Testing" },
                    { 4, "MIGRATION", "#F59E0B", true, "Migration" },
                    { 5, "RESEARCH", "#8B5CF6", true, "Research" },
                    { 6, "DOCUMENTATION", "#64748B", true, "Documentation" },
                    { 7, "DESIGN", "#EC4899", true, "Design" },
                    { 8, "DEVOPS", "#0EA5E9", true, "DevOps" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_tasks_task_type_id",
                table: "tasks",
                column: "task_type_id");

            migrationBuilder.CreateIndex(
                name: "IX_task_types_code",
                table: "task_types",
                column: "code",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_tasks_task_types_task_type_id",
                table: "tasks",
                column: "task_type_id",
                principalTable: "task_types",
                principalColumn: "task_type_id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_tasks_task_types_task_type_id",
                table: "tasks");

            migrationBuilder.DropTable(
                name: "task_types");

            migrationBuilder.DropIndex(
                name: "IX_tasks_task_type_id",
                table: "tasks");

            migrationBuilder.DropColumn(
                name: "task_type_id",
                table: "tasks");
        }
    }
}
