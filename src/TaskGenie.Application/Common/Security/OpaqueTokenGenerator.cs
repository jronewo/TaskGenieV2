using System.Security.Cryptography;
using System.Text;

namespace TaskGenie.Application.Common.Security;

/// <summary>Generates high-entropy opaque secrets (refresh tokens, password reset tokens) and
/// hashes them for storage. The raw secret must never be persisted — only its hash.</summary>
public static class OpaqueTokenGenerator
{
    public static string GenerateRawToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes).Replace('+', '-').Replace('/', '_').TrimEnd('=');
    }

    public static string Hash(string rawToken)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));
}
