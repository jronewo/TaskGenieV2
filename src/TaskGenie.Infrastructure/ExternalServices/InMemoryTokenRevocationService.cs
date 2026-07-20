using System.Collections.Concurrent;
using TaskGenie.Application.Interfaces;

namespace TaskGenie.Infrastructure.ExternalServices;

public class InMemoryTokenRevocationService : ITokenRevocationService
{
    private readonly ConcurrentDictionary<string, DateTime> _revoked = new();

    public void Revoke(string jti, DateTime expiresAtUtc)
    {
        if (!string.IsNullOrWhiteSpace(jti))
            _revoked[jti] = expiresAtUtc;
        PurgeExpired();
    }

    public bool IsRevoked(string jti)
    {
        PurgeExpired();
        return _revoked.ContainsKey(jti);
    }

    private void PurgeExpired()
    {
        var now = DateTime.UtcNow;
        foreach (var entry in _revoked.Where(e => e.Value <= now))
            _revoked.TryRemove(entry.Key, out _);
    }
}
