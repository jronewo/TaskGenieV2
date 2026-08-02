using System.Security.Claims;
using TaskGenie.API.Authorization;
using TaskGenie.Application.Interfaces;

namespace TaskGenie.API.Services;

/// <summary>Reads the current actor from the validated JWT claims on HttpContext.User. Never
/// trust a client-supplied userId/CreatedBy in place of this.</summary>
public sealed class CurrentUser(IHttpContextAccessor httpContextAccessor) : ICurrentUser
{
    private ClaimsPrincipal? Principal => httpContextAccessor.HttpContext?.User;

    public int UserId
    {
        get
        {
            var id = Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(id, out var userId) ? userId : 0;
        }
    }

    public string Role => Principal?.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

    public string Email => Principal?.FindFirstValue(ClaimTypes.Email) ?? string.Empty;

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated ?? false;

    public bool IsPlatformAdmin => Role == PlatformRoles.PlatformAdmin;
}
