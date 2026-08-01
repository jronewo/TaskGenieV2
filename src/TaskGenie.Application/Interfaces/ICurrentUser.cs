namespace TaskGenie.Application.Interfaces;

/// <summary>Actor identity resolved from the validated JWT. Never populate from client-supplied
/// body/query/header values — see AuthenticationExtensions/HttpContextExtensions in the API layer.</summary>
public interface ICurrentUser
{
    int UserId { get; }
    string Role { get; }
    bool IsAuthenticated { get; }
    bool IsPlatformAdmin { get; }
}
