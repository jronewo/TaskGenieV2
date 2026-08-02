namespace TaskGenie.API.RateLimiting;

public static class AuthRateLimitPolicies
{
    /// <summary>Applied to register/login/google/refresh.</summary>
    public const string Auth = "AuthPolicy";

    /// <summary>Applied to forgot-password/reset-password — tighter, since these gate account
    /// takeover via email.</summary>
    public const string PasswordReset = "PasswordResetPolicy";
}
