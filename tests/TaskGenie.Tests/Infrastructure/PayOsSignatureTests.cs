using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using TaskGenie.Infrastructure.ExternalServices.PayOs;

namespace TaskGenie.Tests.Infrastructure;

/// <summary>
/// PayOS signs both checkout-creation requests and webhook payloads as HMAC-SHA256 over the fields
/// sorted alphabetically by key and joined "key=value&amp;...". These tests build the expected
/// canonical string and hash it directly with <see cref="HMACSHA256"/> — independently of
/// <see cref="PayOsSignature"/> — so a bug in the sorting/canonicalization logic cannot hide behind a
/// self-referential assertion.
/// </summary>
public sealed class PayOsSignatureTests
{
    private const string ChecksumKey = "test-checksum-key";

    [Fact]
    public void Sign_SortsFieldsAlphabeticallyRegardlessOfInputOrder()
    {
        var fields = new Dictionary<string, string>
        {
            ["returnUrl"] = "https://taskgenie.local/return",
            ["amount"] = "249000",
            ["orderCode"] = "42",
            ["description"] = "TaskGenie #42",
            ["cancelUrl"] = "https://taskgenie.local/cancel",
        };

        var expectedCanonical =
            "amount=249000&cancelUrl=https://taskgenie.local/cancel&description=TaskGenie #42"
            + "&orderCode=42&returnUrl=https://taskgenie.local/return";
        var expected = Convert.ToHexStringLower(
            HMACSHA256.HashData(Encoding.UTF8.GetBytes(ChecksumKey), Encoding.UTF8.GetBytes(expectedCanonical)));

        var actual = PayOsSignature.Sign(fields, ChecksumKey);

        Assert.Equal(expected, actual);
    }

    [Fact]
    public void Sign_IsOrderIndependent()
    {
        var a = new Dictionary<string, string> { ["z"] = "1", ["a"] = "2" };
        var b = new Dictionary<string, string> { ["a"] = "2", ["z"] = "1" };

        Assert.Equal(PayOsSignature.Sign(a, ChecksumKey), PayOsSignature.Sign(b, ChecksumKey));
    }

    [Fact]
    public void Sign_ChangingAnyFieldChangesTheSignature()
    {
        var original = new Dictionary<string, string> { ["amount"] = "10000", ["orderCode"] = "1" };
        var tampered = new Dictionary<string, string> { ["amount"] = "10001", ["orderCode"] = "1" };

        Assert.NotEqual(PayOsSignature.Sign(original, ChecksumKey), PayOsSignature.Sign(tampered, ChecksumKey));
    }

    [Fact]
    public void ToSignableFields_StringifiesPrimitivesAndNullsLikePayOsDoes()
    {
        using var doc = JsonDocument.Parse(
            """
            {
              "orderCode": 123,
              "amount": 3000,
              "description": "VQRIO123",
              "reference": null,
              "success": true
            }
            """);

        var fields = PayOsSignature.ToSignableFields(doc.RootElement);

        Assert.Equal("123", fields["orderCode"]);
        Assert.Equal("3000", fields["amount"]);
        Assert.Equal("VQRIO123", fields["description"]);
        Assert.Equal(string.Empty, fields["reference"]);
        Assert.Equal("true", fields["success"]);
    }

    [Fact]
    public void Matches_IsTrueOnlyForTheExactSignature()
    {
        var fields = new Dictionary<string, string> { ["amount"] = "10000", ["orderCode"] = "1" };
        var signature = PayOsSignature.Sign(fields, ChecksumKey);

        Assert.True(PayOsSignature.Matches(signature, signature));
        Assert.False(PayOsSignature.Matches(signature, "0000000000000000000000000000000000000000000000000000000000000000"));
    }
}
