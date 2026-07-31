using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaskGenie.Infrastructure.Migrations;

/// <inheritdoc />
public partial class AddProjectType : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "project_type",
            table: "projects",
            type: "nvarchar(20)",
            maxLength: 20,
            nullable: false,
            defaultValue: "Team");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "project_type",
            table: "projects");
    }
}
