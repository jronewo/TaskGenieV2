namespace TaskGenie.API.Middleware;

public class CurrentUserMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var header = context.Request.Headers["X-User-Id"].FirstOrDefault();
        if (header != null && int.TryParse(header, out var id))
            context.Items["CurrentUserId"] = id;
        await next(context);
    }
}

public static class HttpContextExtensions
{
    public static int GetCurrentUserId(this HttpContext ctx)
        => ctx.Items.TryGetValue("CurrentUserId", out var id) && id is int i ? i : 0;
}
