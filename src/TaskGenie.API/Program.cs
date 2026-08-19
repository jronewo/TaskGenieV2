using FluentValidation;
using MediatR;
using Microsoft.OpenApi;
using TaskGenie.Application;
using TaskGenie.Application.Common.Behaviors;
using TaskGenie.Application.Features.Tasks.Commands;
using TaskGenie.Infrastructure;
using TaskGenie.Infrastructure.Persistence;
using TaskGenie.API.Extensions;
using TaskGenie.API.Middleware;
using TaskGenie.API.Services;
using TaskGenie.Application.Interfaces;

using Microsoft.AspNetCore.SignalR;
using TaskGenie.API.Realtime;
using TaskGenie.Application.Interfaces;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddInfrastructure(builder.Configuration, builder.Environment.EnvironmentName);
builder.Services.AddApplication();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();

builder.Services.AddMediatR(cfg =>
    cfg.RegisterServicesFromAssembly(typeof(CreateTaskCommand).Assembly));

builder.Services.AddValidatorsFromAssembly(typeof(CreateTaskCommand).Assembly);
builder.Services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
builder.Services.AddTransient(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));

builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddAuthRateLimiting(builder.Environment);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "TaskGenie API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header. Example: \"Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    c.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer", document)] = []
    });
});
// Realtime notifications. The hub is authorised with the same JWT as the REST API.
// camelCase on the wire so the payload matches every other JSON the web client consumes; the
// SignalR JSON protocol does not apply a naming policy by default.
builder.Services.AddSignalR()
    .AddJsonProtocol(options =>
        options.PayloadSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase);
builder.Services.AddSingleton<IUserIdProvider, JwtUserIdProvider>();
builder.Services.AddScoped<IRealtimeNotifier, SignalRNotificationPublisher>();

builder.Services.AddCors(options =>
    options.AddPolicy("AllowAll", p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "TaskGenie API v1"));
app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");

// No runtime seeding. Demo users/projects/teams must never be conjured at startup — UAT and
// production data are created through the real API, and reference data (plans, risk rules) ships
// as EF `HasData` in migrations instead.

// Controlled first-administrator bootstrap; a no-op unless configured and the platform has no
// active admin yet. See PlatformAdminBootstrap for why this is configuration, not seed data.
await app.BootstrapPlatformAdminAsync();

app.Run();

public partial class Program { }
