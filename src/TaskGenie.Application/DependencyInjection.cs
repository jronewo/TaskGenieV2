using Microsoft.Extensions.DependencyInjection;
using TaskGenie.Application.Features.Auth.Services;
using TaskGenie.Application.Interfaces;

namespace TaskGenie.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthTokenIssuer, AuthTokenIssuer>();
        return services;
    }
}
