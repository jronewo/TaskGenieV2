using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TaskGenie.Infrastructure.Persistence;

#nullable disable

namespace TaskGenie.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260801120000_AddTeamIsProjectManaged")]
    /// <inheritdoc />
    public partial class AddTeamIsProjectManaged : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_project_managed",
                table: "teams",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "is_project_managed",
                table: "teams");
        }
    }
}
