using System.Text.Json;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using ValidationException = TaskGenie.Application.Common.Exceptions.ValidationException;

namespace TaskGenie.API.Middleware;

public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger, IHostEnvironment env)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (ValidationException ex)
        {
            logger.LogWarning(ex, "Validation failure");
            context.Response.StatusCode = 400;
            context.Response.ContentType = "application/json";
            var body = JsonSerializer.Serialize(new { errors = ex.Errors });
            await context.Response.WriteAsync(body);
        }
        catch (PlanUpgradeRequiredException ex)
        {
            logger.LogInformation("Plan quota reached");
            context.Response.StatusCode = 403;
            context.Response.ContentType = "application/json";
            var body = JsonSerializer.Serialize(new
            {
                code = PlanUpgradeRequiredException.Code,
                message = ex.Message,
                limit = ex.Limit,
                usage = ex.Usage
            });
            await context.Response.WriteAsync(body);
        }
        catch (ForbiddenException ex)
        {
            logger.LogWarning(ex, "Forbidden");
            context.Response.StatusCode = 403;
            context.Response.ContentType = "application/json";
            var body = JsonSerializer.Serialize(new { message = ex.Message });
            await context.Response.WriteAsync(body);
        }
        catch (NotFoundException ex)
        {
            logger.LogWarning(ex, "Not found");
            context.Response.StatusCode = 404;
            context.Response.ContentType = "application/json";
            var body = JsonSerializer.Serialize(new { message = ex.Message });
            await context.Response.WriteAsync(body);
        }
        catch (InvalidOperationException ex)
        {
            logger.LogWarning(ex, "Invalid operation");
            context.Response.StatusCode = 400;
            context.Response.ContentType = "application/json";
            var body = JsonSerializer.Serialize(new { message = ex.Message });
            await context.Response.WriteAsync(body);
        }
        catch (AccountBannedException ex)
        {
            // 403 rather than 401: the credentials were fine, the account is not. The end date goes
            // in the body so the client can show how long it lasts instead of a dead end.
            logger.LogWarning("Banned account attempted to sign in.");
            context.Response.StatusCode = 403;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                message = ex.Message,
                code = "ACCOUNT_BANNED",
                bannedUntil = ex.BannedUntil,
                isPermanent = ex.IsPermanent,
                reason = ex.Reason,
            }));
        }
        catch (UnauthorizedAccessException ex)
        {
            logger.LogWarning(ex, "Unauthorized");
            context.Response.StatusCode = 401;
            context.Response.ContentType = "application/json";
            var body = JsonSerializer.Serialize(new { message = ex.Message });
            await context.Response.WriteAsync(body);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception");
            context.Response.StatusCode = 500;
            context.Response.ContentType = "application/json";
            var innerMsg = ex.InnerException != null ? $"\nInner: {ex.InnerException.GetType().Name}: {ex.InnerException.Message}" : "";
            var message = env.IsDevelopment() ? $"{ex.GetType().Name}: {ex.Message}{innerMsg}\n{ex.StackTrace}" : "An unexpected error occurred.";
            var body = JsonSerializer.Serialize(new { message });
            await context.Response.WriteAsync(body);
        }
    }
}
