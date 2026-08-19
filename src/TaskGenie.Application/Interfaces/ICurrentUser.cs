namespace TaskGenie.Application.Interfaces;

/// <summary>Actor identity resolved from the validated JWT. Never populate from client-supplied
/// body/query/header values — see AuthenticationExtensions/HttpContextExtensions in the API layer.</summary>
public interface ICurrentUser
{
    int UserId { get; }
    string Role { get; }

    /// <summary>Email from the validated JWT. Used to prove an invitation was addressed to the
    /// caller — never read the target email from the request.</summary>
    string Email { get; }

    bool IsAuthenticated { get; }
    bool IsPlatformAdmin { get; }
}
