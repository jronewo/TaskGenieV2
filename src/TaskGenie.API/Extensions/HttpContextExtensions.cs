using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace TaskGenie.API.Extensions;

public static class HttpContextExtensions
{
    public static int GetCurrentUserId(this HttpContext ctx)
    {
        var id = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(id, out var userId) ? userId : 0;
    }

    public static string? GetCurrentUserJti(this HttpContext ctx)
        => ctx.User.FindFirstValue(JwtRegisteredClaimNames.Jti);

    public static DateTime? GetTokenExpiration(this HttpContext ctx)
    {
        var exp = ctx.User.FindFirstValue(JwtRegisteredClaimNames.Exp);
        if (exp == null || !long.TryParse(exp, out var unixSeconds))
            return null;

        return DateTimeOffset.FromUnixTimeSeconds(unixSeconds).UtcDateTime;
    }
}
