namespace TaskGenie.Application.Interfaces;

public interface IGoogleAuthService
{
    Task<GoogleUserInfo?> VerifyTokenAsync(string idToken);
}

public record GoogleUserInfo(string Email, string Name, string? Picture);
