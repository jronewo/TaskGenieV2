using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaskGenie.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationProjectAndImage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "image_url",
                table: "notifications",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "project_id",
                table: "notifications",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_notifications_project_id",
                table: "notifications",
                column: "project_id");

            migrationBuilder.AddForeignKey(
                name: "FK_notifications_projects_project_id",
                table: "notifications",
                column: "project_id",
                principalTable: "projects",
                principalColumn: "project_id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_notifications_projects_project_id",
                table: "notifications");

            migrationBuilder.DropIndex(
                name: "IX_notifications_project_id",
                table: "notifications");

            migrationBuilder.DropColumn(
                name: "image_url",
                table: "notifications");

            migrationBuilder.DropColumn(
                name: "project_id",
                table: "notifications");
        }
    }
}
