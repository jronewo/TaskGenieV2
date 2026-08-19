using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;
using TaskGenie.Application.Interfaces;

namespace TaskGenie.Infrastructure.ExternalServices;

public class GoogleAuthService : IGoogleAuthService
{
    private readonly IConfiguration _configuration;

    public GoogleAuthService(IConfiguration configuration) => _configuration = configuration;

    /// <summary>
    /// Every client id whose tokens this server will accept.
    ///
    /// One platform, one OAuth client: the web app signs in with a Web client, and a standalone
    /// Android build must use an Android client registered against its package name and signing
    /// fingerprint. Those issue tokens with *different* audiences, so accepting only a single id —
    /// which is what this did — silently rejects every sign-in from the phone.
    ///
    /// `GoogleAuth:ClientId` is still read so existing configuration keeps working;
    /// `GoogleAuth:ClientIds` (comma-separated) adds the others.
    /// </summary>
    private string[] AllowedAudiences()
    {
        var ids = new List<string>();

        var single = _configuration["GoogleAuth:ClientId"];
        if (!string.IsNullOrWhiteSpace(single)) ids.Add(single.Trim());

        var many = _configuration["GoogleAuth:ClientIds"];
        if (!string.IsNullOrWhiteSpace(many))
            ids.AddRange(many.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));

        return ids.Distinct(StringComparer.Ordinal).ToArray();
    }

    public async Task<GoogleUserInfo?> VerifyTokenAsync(string idToken)
    {
        try
        {
            var audiences = AllowedAudiences();
            if (audiences.Length == 0) return null;

            var settings = new GoogleJsonWebSignature.ValidationSettings { Audience = audiences };
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
