using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaskGenie.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSubscriptionOrganizationSkillFoundation : Migration
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

            migrationBuilder.AddColumn<bool>(
                name: "is_active",
                table: "skills",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.CreateTable(
                name: "organization_members",
                columns: table => new
                {
                    organization_member_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    organization_id = table.Column<int>(type: "int", nullable: false),
                    user_id = table.Column<int>(type: "int", nullable: false),
                    role = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "(getdate())"),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_organization_members", x => x.organization_member_id);
                    table.ForeignKey(
                        name: "FK_organization_members_organizations",
                        column: x => x.organization_id,
                        principalTable: "organizations",
                        principalColumn: "organization_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_organization_members_users",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "plans",
                columns: table => new
                {
                    plan_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    scope = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    price_cents = table.Column<int>(type: "int", nullable: false),
                    currency = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    billing_period_days = table.Column<int>(type: "int", nullable: false),
                    project_limit = table.Column<int>(type: "int", nullable: true),
                    features = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    is_active = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "(getdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_plans", x => x.plan_id);
                });

            migrationBuilder.CreateTable(
                name: "subscriptions",
                columns: table => new
                {
                    subscription_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    subscriber_user_id = table.Column<int>(type: "int", nullable: true),
                    subscriber_organization_id = table.Column<int>(type: "int", nullable: true),
                    plan_id = table.Column<int>(type: "int", nullable: false),
                    status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    started_at = table.Column<DateTime>(type: "datetime", nullable: true),
                    current_period_end = table.Column<DateTime>(type: "datetime", nullable: true),
                    canceled_at = table.Column<DateTime>(type: "datetime", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "(getdate())"),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_subscriptions", x => x.subscription_id);
                    table.ForeignKey(
                        name: "FK_subscriptions_organizations",
                        column: x => x.subscriber_organization_id,
                        principalTable: "organizations",
                        principalColumn: "organization_id");
                    table.ForeignKey(
                        name: "FK_subscriptions_plans",
                        column: x => x.plan_id,
                        principalTable: "plans",
                        principalColumn: "plan_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_subscriptions_users",
                        column: x => x.subscriber_user_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "payment_transactions",
                columns: table => new
                {
                    payment_transaction_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    subscription_id = table.Column<int>(type: "int", nullable: false),
                    amount_cents = table.Column<int>(type: "int", nullable: false),
                    currency = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    gateway_reference = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "(getdate())"),
                    confirmed_at = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payment_transactions", x => x.payment_transaction_id);
                    table.ForeignKey(
                        name: "FK_payment_transactions_subscriptions",
                        column: x => x.subscription_id,
                        principalTable: "subscriptions",
                        principalColumn: "subscription_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_organization_members_user_id",
                table: "organization_members",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "UQ_organization_members",
                table: "organization_members",
                columns: new[] { "organization_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payment_transactions_subscription_id",
                table: "payment_transactions",
                column: "subscription_id");

            migrationBuilder.CreateIndex(
                name: "UQ_plans_code",
                table: "plans",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_subscriptions_plan_id",
                table: "subscriptions",
                column: "plan_id");

            migrationBuilder.CreateIndex(
                name: "IX_subscriptions_subscriber_organization_id",
                table: "subscriptions",
                column: "subscriber_organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_subscriptions_subscriber_user_id",
                table: "subscriptions",
                column: "subscriber_user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "organization_members");

            migrationBuilder.DropTable(
                name: "payment_transactions");

            migrationBuilder.DropTable(
                name: "subscriptions");

            migrationBuilder.DropTable(
                name: "plans");

            migrationBuilder.DropColumn(
                name: "is_project_managed",
                table: "teams");

            migrationBuilder.DropColumn(
                name: "is_active",
                table: "skills");
        }
    }
}
