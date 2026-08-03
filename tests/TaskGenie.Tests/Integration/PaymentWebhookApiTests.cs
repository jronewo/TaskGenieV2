using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using TaskGenie.API.Controllers;

namespace TaskGenie.Tests.Integration;

/// <summary>
/// The webhook is the one route that can mark money as received without a signed-in user, so the
/// negative cases matter more than the happy one.
/// </summary>
public sealed class PaymentWebhookApiTests
{
    private const string Secret = "test-webhook-secret";

    private static HttpClient CreateClient(BillingApiFactory factory, string? secret)
    {
        return factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, config) =>
            {
                if (secret is not null)
                    config.AddInMemoryCollection(new Dictionary<string, string?>
                    {
                        ["Payments:WebhookSecret"] = secret,
                    });
            });
        }).CreateClient();
    }

    [Fact]
    public async Task WithNoSecretConfigured_TheRouteDoesNotExist()
    {
        await using var factory = new BillingApiFactory();
        using var client = CreateClient(factory, secret: null);

        var response = await client.PostAsJsonAsync("/api/payment-webhook/settle",
            new { paymentId = 1, status = "SUCCEEDED" });

        // An unconfigured deployment must never expose a way to mark payments as paid.
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task WithoutTheSignatureHeader_ItIsRejected()
    {
        await using var factory = new BillingApiFactory();
        using var client = CreateClient(factory, Secret);

        var response = await client.PostAsJsonAsync("/api/payment-webhook/settle",
            new { paymentId = 1, status = "SUCCEEDED" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task WithTheWrongSecret_ItIsRejected()
    {
        await using var factory = new BillingApiFactory();
        using var client = CreateClient(factory, Secret);
        client.DefaultRequestHeaders.Add(PaymentWebhookController.SignatureHeader, "not-the-secret");

        var response = await client.PostAsJsonAsync("/api/payment-webhook/settle",
            new { paymentId = 1, status = "SUCCEEDED" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task WithAValidSecretButAnUnknownStatus_ItIsRejected()
    {
        await using var factory = new BillingApiFactory();
        using var client = CreateClient(factory, Secret);
        client.DefaultRequestHeaders.Add(PaymentWebhookController.SignatureHeader, Secret);

        var response = await client.PostAsJsonAsync("/api/payment-webhook/settle",
            new { paymentId = 1, status = "PARTIALLY_PAID" });

        // A gateway inventing a status must not put a payment into a state nothing understands.
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task WithAValidSecret_SettlesAPaymentTheCallerHasNoJwtOwnershipOf()
    {
        // Regression: SettlePaymentAsync used to run its "caller owns this payment" check even for
        // an anonymous webhook caller (UserId defaults to 0), so a real gateway callback always
        // 403'd against the actual owner's payment. Signature/secret verification IS the auth here.
        await using var factory = new BillingApiFactory();
        using var checkoutClient = factory.CreateClient();
        var user = await factory.SeedUserAsync();
        await factory.AuthenticateAsync(checkoutClient, user);
        var planId = await factory.GetPlanIdAsync("PRO_PERSONAL");
        var checkout = await checkoutClient.PostAsJsonAsync("/api/billing/checkout-sessions",
            new { planId, organizationId = (int?)null, idempotencyKey = (string?)null });
        var paymentId = (await checkout.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>())
            .GetProperty("paymentTransactionId").GetInt32();

        using var client = CreateClient(factory, Secret);
        client.DefaultRequestHeaders.Add(PaymentWebhookController.SignatureHeader, Secret);
        var response = await client.PostAsJsonAsync("/api/payment-webhook/settle",
            new { paymentId, status = "SUCCEEDED" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await factory.WithDbAsync(db =>
            Assert.Equal("ACTIVE", db.Subscriptions.Single(s => s.UserId == user).Status));
    }
}
