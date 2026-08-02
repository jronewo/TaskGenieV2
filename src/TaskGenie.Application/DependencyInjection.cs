using Microsoft.Extensions.DependencyInjection;
using TaskGenie.Application.Common.Services;
using TaskGenie.Application.Features.Auth.Services;
using TaskGenie.Application.Interfaces;

namespace TaskGenie.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthTokenIssuer, AuthTokenIssuer>();
        services.AddScoped<IResourceAuthorizationService, ResourceAuthorizationService>();
        services.AddScoped<IRefreshTokenService, RefreshTokenService>();
        services.AddScoped<IEntitlementService, EntitlementService>();
        services.AddScoped<IBillingService, BillingService>();
        return services;
    }
}
