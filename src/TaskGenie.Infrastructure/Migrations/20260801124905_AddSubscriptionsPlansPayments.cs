using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace TaskGenie.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSubscriptionsPlansPayments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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

            migrationBuilder.InsertData(
                table: "plans",
                columns: new[] { "plan_id", "billing_period_days", "code", "created_at", "currency", "features", "is_active", "name", "price_cents", "project_limit", "scope" },
                values: new object[,]
                {
                    { 1, 36500, "FREE_PERSONAL", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "USD", "Up to 2 projects,Core task management,AI risk analysis", true, "Free", 0, 2, "Personal" },
                    { 2, 30, "PRO_PERSONAL", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "USD", "Unlimited projects,Priority AI analysis,Assignment recommendations", true, "Pro", 999, null, "Personal" },
                    { 3, 36500, "FREE_ORGANIZATION", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "USD", "Up to 2 projects", true, "Organization Free", 0, 2, "Organization" },
                    { 4, 30, "PRO_ORGANIZATION", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "USD", "Unlimited projects,Team-wide premium entitlement,Priority support", true, "Organization Pro", 4999, null, "Organization" }
                });

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
                name: "payment_transactions");

            migrationBuilder.DropTable(
                name: "subscriptions");

            migrationBuilder.DropTable(
                name: "plans");
        }
    }
}
