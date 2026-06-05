namespace TaskGenie.Application.Interfaces;

public interface ITokenRevocationService
{
    void Revoke(string jti, DateTime expiresAtUtc);
    bool IsRevoked(string jti);
}
