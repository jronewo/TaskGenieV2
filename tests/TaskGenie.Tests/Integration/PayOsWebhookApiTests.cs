using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using TaskGenie.Infrastructure.ExternalServices.PayOs;

namespace TaskGenie.Tests.Integration;

/// <summary>
/// PayOS is the only place a payment is ever marked as paid — unlike the return-URL redirect, this
/// route is unauthenticated by design, so the signature check carries all of the trust. Checkout
/// (which needs a signed-in user) always goes through the factory's plain client; the PayOS-configured
/// client is only ever used to call the webhook itself, mirroring how a real gateway — with no user
/// session at all — would call it.
/// </summary>
public sealed class PayOsWebhookApiTests
{
    private const string ChecksumKey = "test-payos-checksum-key";

    private static HttpClient CreateWebhookClient(BillingApiFactory factory, bool configured)
    {
        return factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, config) =>
            {
                if (configured)
                    config.AddInMemoryCollection(new Dictionary<string, string?>
                    {
                        ["PayOS:ClientId"] = "test-client-id",
                        ["PayOS:ApiKey"] = "test-api-key",
                        ["PayOS:ChecksumKey"] = ChecksumKey,
                    });
            });
        }).CreateClient();
    }

    private static async Task<(int PaymentId, int UserId)> CreateCheckoutAsync(BillingApiFactory factory, string planCode)
    {
        using var client = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(client, user);
        var planId = await factory.GetPlanIdAsync(planCode);

        var response = await client.PostAsJsonAsync("/api/billing/checkout-sessions",
            new { planId, organizationId = (int?)null, idempotencyKey = (string?)null });
        response.EnsureSuccessStatusCode();
        var paymentId = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("paymentTransactionId").GetInt32();
        return (paymentId, user);
    }

    private static object BuildWebhookBody(int orderCode, bool success, string dataCode, string checksumKey)
    {
        var fields = new Dictionary<string, string>
        {
            ["orderCode"] = orderCode.ToString(),
            ["amount"] = "249000",
            ["description"] = "TaskGenie test",
            ["code"] = dataCode,
            ["desc"] = "Thành công",
        };
        var signature = PayOsSignature.Sign(fields, checksumKey);

        return new
        {
            code = "00",
            desc = "success",
            success,
            data = new
            {
                orderCode,
                amount = 249000,
                description = "TaskGenie test",
                code = dataCode,
                desc = "Thành công",
            },
            signature,
        };
    }

    [Fact]
    public async Task WithPayOsNotConfigured_TheRouteDoesNotExist()
    {
        await using var factory = new BillingApiFactory();
        using var client = CreateWebhookClient(factory, configured: false);

        var response = await client.PostAsJsonAsync("/api/webhooks/payos",
            BuildWebhookBody(orderCode: 1, success: true, dataCode: "00", checksumKey: ChecksumKey));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task WithAWrongSignature_ItIsRejected()
    {
        await using var factory = new BillingApiFactory();
        var (paymentId, _) = await CreateCheckoutAsync(factory, "PRO_PERSONAL");
        using var client = CreateWebhookClient(factory, configured: true);

        var body = BuildWebhookBody(paymentId, success: true, dataCode: "00", checksumKey: "not-the-checksum-key");
        var response = await client.PostAsJsonAsync("/api/webhooks/payos", body);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        await factory.WithDbAsync(db =>
            Assert.Equal("PENDING", db.PaymentTransactions.Single(p => p.PaymentTransactionId == paymentId).Status));
    }

    [Fact]
    public async Task ValidSuccessWebhook_ActivatesSubscriptionAndGrantsPremium()
    {
        await using var factory = new BillingApiFactory();
        var (paymentId, userId) = await CreateCheckoutAsync(factory, "PRO_PERSONAL");
        using var client = CreateWebhookClient(factory, configured: true);

        var body = BuildWebhookBody(paymentId, success: true, dataCode: "00", checksumKey: ChecksumKey);
        var response = await client.PostAsJsonAsync("/api/webhooks/payos", body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await factory.WithDbAsync(db =>
        {
            Assert.Equal("SUCCEEDED", db.PaymentTransactions.Single(p => p.PaymentTransactionId == paymentId).Status);
            Assert.Equal("ACTIVE", db.Subscriptions.Single(s => s.UserId == userId).Status);
        });
    }

    [Fact]
    public async Task FailedWebhook_GrantsNoPremium()
    {
        await using var factory = new BillingApiFactory();
        var (paymentId, userId) = await CreateCheckoutAsync(factory, "PRO_PERSONAL");
        using var client = CreateWebhookClient(factory, configured: true);

        var body = BuildWebhookBody(paymentId, success: false, dataCode: "01", checksumKey: ChecksumKey);
        var response = await client.PostAsJsonAsync("/api/webhooks/payos", body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await factory.WithDbAsync(db =>
        {
            Assert.Equal("FAILED", db.PaymentTransactions.Single(p => p.PaymentTransactionId == paymentId).Status);
            Assert.Equal("PENDING", db.Subscriptions.Single(s => s.UserId == userId).Status);
        });
    }

    [Fact]
    public async Task DuplicateSuccessWebhook_IsIdempotent()
    {
        await using var factory = new BillingApiFactory();
        var (paymentId, userId) = await CreateCheckoutAsync(factory, "PRO_PERSONAL");
        using var client = CreateWebhookClient(factory, configured: true);

        var body = BuildWebhookBody(paymentId, success: true, dataCode: "00", checksumKey: ChecksumKey);
        var first = await client.PostAsJsonAsync("/api/webhooks/payos", body);
        var second = await client.PostAsJsonAsync("/api/webhooks/payos", body);

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        await factory.WithDbAsync(db =>
            Assert.Equal(1, db.Subscriptions.Count(s => s.UserId == userId)));
    }

    [Fact]
    public async Task UnknownOrderCode_IsAcknowledgedWithoutTouchingBilling()
    {
        await using var factory = new BillingApiFactory();
        using var client = CreateWebhookClient(factory, configured: true);

        var body = BuildWebhookBody(orderCode: 999_999, success: true, dataCode: "00", checksumKey: ChecksumKey);
        var response = await client.PostAsJsonAsync("/api/webhooks/payos", body);

        // A registration test ping or a stale order code is not a signature problem — PayOS must not
        // be made to retry forever, but nothing in billing should change either.
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
