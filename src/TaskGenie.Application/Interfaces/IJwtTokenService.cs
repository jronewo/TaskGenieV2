namespace TaskGenie.Application.Interfaces;

public record JwtTokenResult(string AccessToken, DateTime ExpiresAtUtc, string Jti);

public interface IJwtTokenService
{
    JwtTokenResult GenerateToken(int userId, string email, string role);
}
