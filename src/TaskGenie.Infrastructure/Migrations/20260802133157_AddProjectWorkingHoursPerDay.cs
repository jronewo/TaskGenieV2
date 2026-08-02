using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaskGenie.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectWorkingHoursPerDay : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "working_hours_per_day",
                table: "projects",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "working_hours_per_day",
                table: "projects");
        }
    }
}
