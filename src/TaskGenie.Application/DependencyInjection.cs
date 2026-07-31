using Microsoft.Extensions.DependencyInjection;
using TaskGenie.Application.Features.Auth.Services;
using TaskGenie.Application.Features.Payments.Services;
using TaskGenie.Application.Interfaces;

namespace TaskGenie.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthTokenIssuer, AuthTokenIssuer>();
        services.AddScoped<IPaymentFulfillmentService, PaymentFulfillmentService>();
        return services;
    }
}
