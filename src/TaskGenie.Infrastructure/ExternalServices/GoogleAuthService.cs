using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;
using TaskGenie.Application.Interfaces;

namespace TaskGenie.Infrastructure.ExternalServices;

public class GoogleAuthService : IGoogleAuthService
{
    private readonly IConfiguration _configuration;

    public GoogleAuthService(IConfiguration configuration) => _configuration = configuration;

    public async Task<GoogleUserInfo?> VerifyTokenAsync(string idToken)
    {
        try
        {
            var settings = new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { _configuration["GoogleAuth:ClientId"] }
            };
            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
            return new GoogleUserInfo(
                Email: payload.Email,
                Name: payload.Name,
                Picture: payload.Picture
            );
        }
        catch { return null; }
    }
}
