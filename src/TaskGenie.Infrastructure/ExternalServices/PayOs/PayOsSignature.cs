using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;

namespace TaskGenie.Infrastructure.ExternalServices.PayOs;

/// <summary>
/// PayOS signs (and expects signed) requests as HMAC-SHA256 over the payload fields sorted
/// alphabetically by key and joined as a query string: <c>key1=value1&amp;key2=value2...</c>.
/// Nested arrays/objects are JSON-stringified with unescaped unicode; null/undefined become "".
/// Used both to sign outgoing checkout requests and to verify incoming webhook signatures, so a bug
/// here would break both directions identically — kept in one place and unit tested directly.
/// </summary>
public static class PayOsSignature
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    public static string Sign(IEnumerable<KeyValuePair<string, string>> fields, string checksumKey)
    {
        var canonical = string.Join(
            '&',
            fields
                .OrderBy(kv => kv.Key, StringComparer.Ordinal)
                .Select(kv => $"{kv.Key}={kv.Value}"));

        var hash = HMACSHA256.HashData(Encoding.UTF8.GetBytes(checksumKey), Encoding.UTF8.GetBytes(canonical));
        return Convert.ToHexStringLower(hash);
    }

    /// <summary>Flattens a PayOS webhook `data` JSON object into signable string fields, following the
    /// same stringification rules PayOS itself uses (numbers/bools as literals, null as "", nested
    /// structures as unescaped-unicode JSON).</summary>
    public static Dictionary<string, string> ToSignableFields(JsonElement dataObject)
    {
        var fields = new Dictionary<string, string>();
        foreach (var property in dataObject.EnumerateObject())
            fields[property.Name] = Stringify(property.Value);
        return fields;
    }

    private static string Stringify(JsonElement value) => value.ValueKind switch
    {
        JsonValueKind.String => value.GetString() ?? string.Empty,
        JsonValueKind.Number => value.GetRawText(),
        JsonValueKind.True => "true",
        JsonValueKind.False => "false",
        JsonValueKind.Null or JsonValueKind.Undefined => string.Empty,
        JsonValueKind.Array or JsonValueKind.Object => JsonSerializer.Serialize(value, JsonOptions),
        _ => string.Empty,
    };

    /// <summary>Constant-time comparison so a wrong signature cannot be guessed via timing. Both sides
    /// are re-hashed first so differing input lengths never leak through comparison time.</summary>
    public static bool Matches(string computedHex, string providedHex) =>
        CryptographicOperations.FixedTimeEquals(
            SHA256.HashData(Encoding.UTF8.GetBytes(computedHex.ToLowerInvariant())),
            SHA256.HashData(Encoding.UTF8.GetBytes(providedHex.ToLowerInvariant())));
}
