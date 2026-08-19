using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using TaskGenie.API.RateLimiting;

namespace TaskGenie.API.Extensions;

public static class RateLimitingExtensions
{
    public static IServiceCollection AddAuthRateLimiting(this IServiceCollection services, IHostEnvironment environment)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, ct) =>
            {
                context.HttpContext.Response.ContentType = "application/json";
                await context.HttpContext.Response.WriteAsync(
                    "{\"message\":\"Too many requests. Please try again later.\"}", ct);
            };

            options.AddPolicy(AuthRateLimitPolicies.Auth, httpContext =>
                Partition(httpContext, environment, "auth", permitLimit: 10, window: TimeSpan.FromMinutes(5)));

            options.AddPolicy(AuthRateLimitPolicies.PasswordReset, httpContext =>
                Partition(httpContext, environment, "pwreset", permitLimit: 5, window: TimeSpan.FromMinutes(15)));

        });

        return services;
    }

    /// <summary>Environments where automated suites and QA sessions legitimately hit the auth
    /// endpoints far harder than any real client. Throttling here only blocks testing; the limit
    /// matters in Staging/Production, where it stays enforced.</summary>
    /// "RateLimitTesting" is deliberately absent — that environment exists so the integration
    /// suite can prove the limiter still returns 429.
    private static bool IsUnthrottledEnvironment(IHostEnvironment environment)
        => environment.IsDevelopment()
           || environment.IsEnvironment("Testing")
           || environment.IsEnvironment("UAT");

    private static RateLimitPartition<string> Partition(
        HttpContext httpContext, IHostEnvironment environment, string policyName, int permitLimit, TimeSpan window)
    {
        if (IsUnthrottledEnvironment(environment))
            return RateLimitPartition.GetNoLimiter($"{policyName}:unlimited");

        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter($"{policyName}:{ip}", _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = permitLimit,
            Window = window,
            QueueLimit = 0
        });
    }
}
