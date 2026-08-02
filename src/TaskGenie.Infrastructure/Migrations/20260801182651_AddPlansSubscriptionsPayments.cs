using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace TaskGenie.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPlansSubscriptionsPayments : Migration
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
                    audience = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    billing_interval = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    price_minor = table.Column<int>(type: "int", nullable: false),
                    currency = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: false),
                    project_limit = table.Column<int>(type: "int", nullable: true),
                    member_limit = table.Column<int>(type: "int", nullable: true),
                    is_active = table.Column<bool>(type: "bit", nullable: false),
                    sort_order = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: true)
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
                    plan_id = table.Column<int>(type: "int", nullable: false),
                    owner_type = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    user_id = table.Column<int>(type: "int", nullable: true),
                    organization_id = table.Column<int>(type: "int", nullable: true),
                    status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    started_at = table.Column<DateTime>(type: "datetime", nullable: true),
                    current_period_end = table.Column<DateTime>(type: "datetime", nullable: true),
                    canceled_at = table.Column<DateTime>(type: "datetime", nullable: true),
                    cancel_at_period_end = table.Column<bool>(type: "bit", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_subscriptions", x => x.subscription_id);
                    table.CheckConstraint("CK_subscriptions_owner_xor", "(user_id IS NOT NULL AND organization_id IS NULL) OR (user_id IS NULL AND organization_id IS NOT NULL)");
                    table.ForeignKey(
                        name: "FK_subscriptions_organizations",
                        column: x => x.organization_id,
                        principalTable: "organizations",
                        principalColumn: "organization_id");
                    table.ForeignKey(
                        name: "FK_subscriptions_plans",
                        column: x => x.plan_id,
                        principalTable: "plans",
                        principalColumn: "plan_id");
                    table.ForeignKey(
                        name: "FK_subscriptions_users",
                        column: x => x.user_id,
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
                    plan_id = table.Column<int>(type: "int", nullable: false),
                    user_id = table.Column<int>(type: "int", nullable: true),
                    organization_id = table.Column<int>(type: "int", nullable: true),
                    amount_minor = table.Column<int>(type: "int", nullable: false),
                    currency = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: false),
                    status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    idempotency_key = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    provider = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    provider_reference = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    is_test = table.Column<bool>(type: "bit", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    completed_at = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payment_transactions", x => x.payment_transaction_id);
                    table.ForeignKey(
                        name: "FK_payment_transactions_plans",
                        column: x => x.plan_id,
                        principalTable: "plans",
                        principalColumn: "plan_id");
                    table.ForeignKey(
                        name: "FK_payment_transactions_subscriptions",
                        column: x => x.subscription_id,
                        principalTable: "subscriptions",
                        principalColumn: "subscription_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "plans",
                columns: new[] { "plan_id", "audience", "billing_interval", "code", "created_at", "currency", "is_active", "member_limit", "name", "price_minor", "project_limit", "sort_order", "updated_at" },
                values: new object[,]
                {
                    { 1, "PERSONAL", "NONE", "FREE_PERSONAL", new DateTime(2026, 8, 1, 0, 0, 0, 0, DateTimeKind.Utc), "USD", true, null, "Free", 0, 2, 1, null },
                    { 2, "PERSONAL", "MONTHLY", "PRO_PERSONAL", new DateTime(2026, 8, 1, 0, 0, 0, 0, DateTimeKind.Utc), "USD", true, null, "Pro", 999, null, 2, null },
                    { 3, "ORGANIZATION", "NONE", "FREE_ORGANIZATION", new DateTime(2026, 8, 1, 0, 0, 0, 0, DateTimeKind.Utc), "USD", true, 5, "Organization Free", 0, 2, 1, null },
                    { 4, "ORGANIZATION", "MONTHLY", "PRO_ORGANIZATION", new DateTime(2026, 8, 1, 0, 0, 0, 0, DateTimeKind.Utc), "USD", true, null, "Organization Pro", 4999, null, 2, null }
                });

            migrationBuilder.CreateIndex(
                name: "IX_payment_transactions_idempotency_key",
                table: "payment_transactions",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payment_transactions_plan_id",
                table: "payment_transactions",
                column: "plan_id");

            migrationBuilder.CreateIndex(
                name: "IX_payment_transactions_subscription_id",
                table: "payment_transactions",
                column: "subscription_id");

            migrationBuilder.CreateIndex(
                name: "IX_plans_code",
                table: "plans",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_subscriptions_organization_id_status",
                table: "subscriptions",
                columns: new[] { "organization_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_subscriptions_plan_id",
                table: "subscriptions",
                column: "plan_id");

            migrationBuilder.CreateIndex(
                name: "IX_subscriptions_user_id_status",
                table: "subscriptions",
                columns: new[] { "user_id", "status" });
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
